from fastapi import FastAPI, Depends, HTTPException, status, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional, List
import redis
import os
import httpx
from datetime import datetime

from models import Base, Survey, UserSurvey, SurveyStatus as DBSurveyStatus, UserActivity
from schemas import (
    SurveyCreate, SurveyResponse, UserSurveyCreate, UserSurveyResponse,
    InterestFieldsRequest, RecommendationResponse
)
from scraper import ArxivScraper
from keyword_extractor import KeywordExtractor
from recommender import SurveyRecommender

# 환경 변수
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://backend-auth:8000")

# 데이터베이스 설정
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis 클라이언트
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# ArXiv Scraper
scraper = ArxivScraper()

# 키워드 추출기
keyword_extractor = KeywordExtractor()

# 추천 시스템
recommender = SurveyRecommender()

# FastAPI 앱
app = FastAPI(title="Survey Service", version="2.0.0")

@app.on_event("startup")
def startup_event():
    """데이터베이스 초기화 (재시도 로직 포함)"""
    import time
    max_retries = 10
    retry_interval = 3

    for attempt in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            print("Database tables created successfully")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Failed to create tables (attempt {attempt + 1}/{max_retries}): {e}")
                print(f"Retrying in {retry_interval} seconds...")
                time.sleep(retry_interval)
            else:
                print(f"Failed to create tables after {max_retries} attempts: {e}")
                raise

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 로깅 미들웨어
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()

    # 요청 로깅
    print(f"\n{'='*80}")
    print(f"📊 [SURVEY] {request.method} {request.url.path}")
    print(f"⏰ Time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Query params 로깅
    if request.query_params:
        print(f"🔍 Query: {dict(request.query_params)}")

    # Authorization 헤더 체크
    auth_header = request.headers.get("authorization")
    if auth_header:
        print(f"👤 Authenticated Request")

    response = await call_next(request)

    # 응답 로깅
    duration = (datetime.now() - start_time).total_seconds()
    status_emoji = "✅" if response.status_code < 400 else "❌"
    print(f"{status_emoji} Status: {response.status_code} | Duration: {duration:.3f}s")
    print(f"{'='*80}\n")

    return response

# 의존성
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def verify_token(authorization: Optional[str] = Header(None)):
    """Auth 서비스를 통해 토큰 검증"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{AUTH_SERVICE_URL}/verify",
                headers={"Authorization": authorization}
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )

            return response.json()
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable"
        )

# 엔드포인트
@app.get("/")
def read_root():
    return {"service": "Survey Service", "status": "running", "version": "2.0.0"}

@app.get("/surveys/user", response_model=List[UserSurveyResponse])
async def get_user_surveys(
    status_filter: Optional[str] = None,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """사용자의 Survey 목록 조회"""
    user_id = user_data["user_id"]

    query = db.query(UserSurvey).filter(UserSurvey.user_id == user_id)

    if status_filter:
        query = query.filter(UserSurvey.status == status_filter)

    user_surveys = query.all()

    # Survey 정보 포함
    result = []
    for us in user_surveys:
        survey = db.query(Survey).filter(Survey.id == us.survey_id).first()
        us_dict = {
            "id": us.id,
            "user_id": us.user_id,
            "survey_id": us.survey_id,
            "status": us.status.value if hasattr(us.status, 'value') else us.status,
            "is_starred": us.is_starred,
            "added_at": us.added_at,
            "completed_at": us.completed_at,
            "survey": survey
        }
        result.append(us_dict)

    return result

@app.get("/surveys/{survey_id}")
async def get_survey(
    survey_id: int,
    increase_view: bool = True,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """특정 Survey 상세 정보 (조회수는 사용자가 보관한 논문일 때만 증가)"""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()

    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )

    # 사용자의 UserSurvey 정보 확인
    user_id = user_data["user_id"]
    user_survey = db.query(UserSurvey).filter(
        and_(
            UserSurvey.user_id == user_id,
            UserSurvey.survey_id == survey_id
        )
    ).first()

    # 조회수 증가 - 보관함에 추가된 논문이고 increase_view가 True일 때만
    if user_survey and increase_view:
        survey.view_count = (survey.view_count or 0) + 1
        db.commit()
        db.refresh(survey)

    return {
        "survey": survey,
        "user_survey": {
            "id": user_survey.id,
            "user_id": user_survey.user_id,
            "survey_id": user_survey.survey_id,
            "status": user_survey.status.value if hasattr(user_survey.status, 'value') else user_survey.status,
            "is_starred": user_survey.is_starred,
            "added_at": user_survey.added_at,
            "completed_at": user_survey.completed_at
        } if user_survey else None
    }

@app.post("/surveys/add", response_model=UserSurveyResponse)
async def add_survey_to_user(
    user_survey: UserSurveyCreate,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """사용자에게 Survey 추가 (보관함에 저장)"""
    user_id = user_data["user_id"]

    # 이미 추가되었는지 확인
    existing = db.query(UserSurvey).filter(
        and_(
            UserSurvey.user_id == user_id,
            UserSurvey.survey_id == user_survey.survey_id
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Survey already added"
        )

    # Survey 존재 확인
    survey = db.query(Survey).filter(Survey.id == user_survey.survey_id).first()
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )

    # UserSurvey 생성
    new_user_survey = UserSurvey(
        user_id=user_id,
        survey_id=user_survey.survey_id,
        status=user_survey.status
    )

    db.add(new_user_survey)
    db.commit()
    db.refresh(new_user_survey)

    return {
        "id": new_user_survey.id,
        "user_id": new_user_survey.user_id,
        "survey_id": new_user_survey.survey_id,
        "status": new_user_survey.status.value if hasattr(new_user_survey.status, 'value') else new_user_survey.status,
        "is_starred": new_user_survey.is_starred,
        "added_at": new_user_survey.added_at,
        "completed_at": new_user_survey.completed_at,
        "survey": survey
    }

@app.put("/surveys/{user_survey_id}/status")
async def update_survey_status(
    user_survey_id: int,
    new_status: str,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Survey 상태 업데이트 (reading, completed 등)"""
    user_id = user_data["user_id"]

    user_survey = db.query(UserSurvey).filter(
        and_(
            UserSurvey.id == user_survey_id,
            UserSurvey.user_id == user_id
        )
    ).first()

    if not user_survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User survey not found"
        )

    user_survey.status = DBSurveyStatus[new_status]

    if new_status == "completed":
        from datetime import datetime, date
        user_survey.completed_at = datetime.utcnow()

        # 스트릭 기록 (completed 상태로 변경될 때만)
        today = date.today()
        activity = db.query(UserActivity).filter(
            and_(
                UserActivity.user_id == user_id,
                UserActivity.activity_date == today
            )
        ).first()

        if activity:
            activity.survey_views += 1
        else:
            activity = UserActivity(
                user_id=user_id,
                activity_date=today,
                survey_views=1
            )
            db.add(activity)

    db.commit()

    return {"message": "Status updated successfully"}

@app.put("/surveys/{user_survey_id}/star")
async def toggle_survey_star(
    user_survey_id: int,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """Survey 즐겨찾기 토글"""
    user_id = user_data["user_id"]

    user_survey = db.query(UserSurvey).filter(
        and_(
            UserSurvey.id == user_survey_id,
            UserSurvey.user_id == user_id
        )
    ).first()

    if not user_survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User survey not found"
        )

    # 스타 상태 토글
    user_survey.is_starred = not user_survey.is_starred
    db.commit()

    return {
        "message": "Star toggled successfully",
        "is_starred": user_survey.is_starred
    }

@app.delete("/surveys/{survey_id}")
async def delete_user_survey(
    survey_id: int,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """사용자의 보관함에서 논문 삭제"""
    user_id = user_data["user_id"]

    # survey_id로 user_survey 찾기
    user_survey = db.query(UserSurvey).filter(
        and_(
            UserSurvey.survey_id == survey_id,
            UserSurvey.user_id == user_id
        )
    ).first()

    if not user_survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found in user's collection"
        )

    db.delete(user_survey)
    db.commit()

    return {"message": "Survey removed successfully"}

@app.post("/recommend/initial", response_model=List[SurveyResponse])
async def initial_recommend(
    request: InterestFieldsRequest,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    초기 추천: 사용자가 선택한 관심 분야 기반 논문 추천
    회원가입 후 또는 읽은 논문이 5개 미만일 때 사용
    """
    print(f"Received request with fields: {request.fields}")

    if not request.fields or len(request.fields) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one interest field is required"
        )

    # ArXiv에서 관심 분야 논문 검색
    arxiv_results = scraper.search_ai_ml_surveys(request.fields, max_results=500)

    # DB에 저장 및 반환
    survey_responses = []
    for result in arxiv_results:
        # 이미 DB에 있는지 확인
        existing_survey = db.query(Survey).filter(
            Survey.arxiv_id == result["arxiv_id"]
        ).first()

        if existing_survey:
            survey_responses.append(existing_survey)
        else:
            # 키워드 추출
            keywords = keyword_extractor.extract_from_title_and_abstract(
                result["title"],
                result["abstract"],
                top_n=3
            )
            keywords_str = ", ".join(keywords)

            # 읽기 시간 추정
            reading_times = scraper.estimate_reading_time(result["abstract"])

            # 새 Survey 생성
            new_survey = Survey(
                arxiv_id=result["arxiv_id"],
                title=result["title"],
                abstract=result["abstract"],
                keywords=keywords_str,
                authors=result["authors"],
                published_date=result["published_date"],
                pdf_url=result["pdf_url"],
                categories=result["categories"],
                estimated_reading_time_beginner=reading_times["beginner"],
                estimated_reading_time_intermediate=reading_times["intermediate"],
                estimated_reading_time_advanced=reading_times["advanced"],
                tags=", ".join(request.fields),
                view_count=0
            )

            db.add(new_survey)
            db.commit()
            db.refresh(new_survey)

            survey_responses.append(new_survey)

    return survey_responses

@app.post("/recommend/personalized", response_model=List[RecommendationResponse])
async def personalized_recommend(
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
    top_n: int = 500
):
    """
    개인화 추천: TF-IDF + Cosine Similarity 기반
    1. ArXiv에서 ML/DL Survey 논문 500개 가져오기
    2. 사용자가 완료한 논문과 유사도 계산
    3. 유사도 순으로 정렬하여 반환
    """
    user_id = user_data["user_id"]
    username = user_data.get("username", "Unknown")
    print(f"✨ User '{username}' requesting personalized recommendations (top {top_n})")

    # 사용자가 읽은 논문 조회 (completed 상태)
    user_surveys = db.query(UserSurvey).filter(
        and_(
            UserSurvey.user_id == user_id,
            UserSurvey.status == DBSurveyStatus.completed
        )
    ).all()

    print(f"📚 User has completed {len(user_surveys)} papers")

    if len(user_surveys) < 5:
        print(f"❌ Not enough papers (minimum 5 required)")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="최소 5개 이상의 논문을 읽어야 개인화 추천을 받을 수 있습니다."
        )

    # 1. ArXiv에서 ML/DL Survey 논문 500개 검색
    print(f"🔍 Fetching 500 ML/DL survey papers from ArXiv...")
    scraper = ArxivScraper()
    arxiv_papers = scraper.search_ml_surveys_for_recommendation(max_results=500)
    print(f"✅ Found {len(arxiv_papers)} papers from ArXiv")

    # 2. DB에 없는 논문 저장 (키워드 자동 추출)
    saved_surveys = []
    for paper_data in arxiv_papers:
        existing = db.query(Survey).filter(Survey.arxiv_id == paper_data["arxiv_id"]).first()
        if not existing:
            # 키워드 자동 추출
            keywords_list = keyword_extractor.extract_from_title_and_abstract(
                paper_data["title"],
                paper_data["abstract"],
                top_n=5
            )
            # 리스트를 콤마로 구분된 문자열로 변환
            keywords_str = ", ".join(keywords_list) if keywords_list else None

            new_survey = Survey(
                arxiv_id=paper_data["arxiv_id"],
                title=paper_data["title"],
                abstract=paper_data["abstract"],
                authors=paper_data["authors"],
                published_date=paper_data["published_date"],
                pdf_url=paper_data["pdf_url"],
                categories=paper_data["categories"],
                keywords=keywords_str
            )
            db.add(new_survey)
            db.commit()
            db.refresh(new_survey)
            saved_surveys.append(new_survey)
        else:
            # 기존 논문에 키워드가 없으면 추출
            if not existing.keywords:
                keywords_list = keyword_extractor.extract_from_title_and_abstract(
                    existing.title,
                    existing.abstract,
                    top_n=5
                )
                existing.keywords = ", ".join(keywords_list) if keywords_list else None
                db.commit()
            saved_surveys.append(existing)

    print(f"💾 Saved/Retrieved {len(saved_surveys)} papers")

    # 3. 읽은 논문 정보 가져오기
    read_paper_ids = [us.survey_id for us in user_surveys]
    read_papers = db.query(Survey).filter(Survey.id.in_(read_paper_ids)).all()

    print(f"🤖 Computing TF-IDF + Cosine Similarity...")

    # 논문 딕셔너리로 변환
    read_papers_dict = [
        {
            'id': p.id,
            'title': p.title,
            'abstract': p.abstract,
            'keywords': p.keywords or ''
        }
        for p in read_papers
    ]

    candidate_papers_dict = [
        {
            'id': p.id,
            'title': p.title,
            'abstract': p.abstract,
            'keywords': p.keywords or ''
        }
        for p in saved_surveys
    ]

    # TF-IDF + Cosine Similarity 추천
    recommendations = recommender.recommend(
        user_read_papers=read_papers_dict,
        all_papers=candidate_papers_dict,
        top_n=top_n
    )

    print(f"✅ Generated {len(recommendations)} recommendations")

    # 결과 생성
    result = []
    for paper_id, similarity_score in recommendations:
        survey = db.query(Survey).filter(Survey.id == paper_id).first()
        if survey:
            result.append({
                "survey": survey,
                "similarity_score": round(float(similarity_score) * 100, 2)  # 퍼센트로 변환
            })

    return result

@app.get("/user/stats")
async def get_user_stats(
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """사용자 통계 정보 (보관 중인 논문 수, 추천받은 논문 수 등)"""
    user_id = user_data["user_id"]

    # 보관 중인 논문 수
    saved_count = db.query(UserSurvey).filter(
        UserSurvey.user_id == user_id
    ).count()

    # 완료한 논문 수
    completed_count = db.query(UserSurvey).filter(
        and_(
            UserSurvey.user_id == user_id,
            UserSurvey.status == DBSurveyStatus.completed
        )
    ).count()

    # 추천받은 논문 수 (recommended 상태)
    recommended_count = db.query(UserSurvey).filter(
        and_(
            UserSurvey.user_id == user_id,
            UserSurvey.status == DBSurveyStatus.recommended
        )
    ).count()

    return {
        "saved_surveys": saved_count,
        "completed_surveys": completed_count,
        "recommended_surveys": recommended_count,
        "can_use_personalized": completed_count >= 5
    }


@app.get("/activity/streak")
async def get_user_streak(
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """사용자의 스트릭 데이터 조회 (최근 365일)"""
    from datetime import date, timedelta

    user_id = user_data["user_id"]
    today = date.today()
    one_year_ago = today - timedelta(days=365)

    # 최근 365일간의 활동 기록 조회
    activities = db.query(UserActivity).filter(
        and_(
            UserActivity.user_id == user_id,
            UserActivity.activity_date >= one_year_ago,
            UserActivity.activity_date <= today
        )
    ).all()

    # 날짜별 활동 맵 생성
    activity_map = {}
    for activity in activities:
        activity_map[activity.activity_date.isoformat()] = activity.survey_views

    # 365일치 데이터 생성 (없는 날짜는 0)
    streak_data = []
    for i in range(365):
        check_date = today - timedelta(days=364 - i)
        date_str = check_date.isoformat()
        streak_data.append({
            "date": date_str,
            "count": activity_map.get(date_str, 0)
        })

    return {
        "streak_data": streak_data,
        "total_days_active": len(activities)
    }

@app.get("/search", response_model=List[SurveyResponse])
async def search_surveys(
    q: str,
    max_results: int = 500,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    키워드 기반 논문 검색

    Args:
        q: 검색 키워드
        max_results: 최대 결과 수
    """
    username = user_data.get("username", "Unknown")
    print(f"🔍 User '{username}' searching: '{q}' (max: {max_results})")

    if not q or len(q.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query is required"
        )

    # ArXiv에서 검색
    print(f"📡 Fetching from ArXiv...")
    arxiv_results = scraper.search_surveys(q, max_results=max_results)
    print(f"✅ Found {len(arxiv_results)} papers from ArXiv")

    # DB에 저장 및 반환
    survey_responses = []
    for result in arxiv_results:
        # 이미 DB에 있는지 확인
        existing_survey = db.query(Survey).filter(
            Survey.arxiv_id == result["arxiv_id"]
        ).first()

        if existing_survey:
            survey_responses.append(existing_survey)
        else:
            # 키워드 추출
            keywords = keyword_extractor.extract_from_title_and_abstract(
                result["title"],
                result["abstract"],
                top_n=3
            )
            keywords_str = ", ".join(keywords)

            # 읽기 시간 추정
            reading_times = scraper.estimate_reading_time(result["abstract"])

            # 새 Survey 생성
            new_survey = Survey(
                arxiv_id=result["arxiv_id"],
                title=result["title"],
                abstract=result["abstract"],
                keywords=keywords_str,
                authors=result["authors"],
                published_date=result["published_date"],
                pdf_url=result["pdf_url"],
                categories=result["categories"],
                estimated_reading_time_beginner=reading_times["beginner"],
                estimated_reading_time_intermediate=reading_times["intermediate"],
                estimated_reading_time_advanced=reading_times["advanced"],
                tags=q,
                view_count=0
            )

            db.add(new_survey)
            db.commit()
            db.refresh(new_survey)

            survey_responses.append(new_survey)

    return survey_responses
