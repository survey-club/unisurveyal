from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, and_
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional, List
import redis
import os
import httpx
from openai import OpenAI

from models import Base, Survey, UserSurvey, SurveyStatus as DBSurveyStatus
from schemas import (
    SurveyCreate, SurveyResponse, UserSurveyCreate, UserSurveyResponse,
    CustomRecommendRequest, EndToEndRecommendRequest
)
from scraper import ArxivScraper

# 환경 변수
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL")
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://backend-auth:8000")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# 데이터베이스 설정
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

# Redis 클라이언트
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# OpenAI 클라이언트
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# ArXiv Scraper
scraper = ArxivScraper()

# FastAPI 앱
app = FastAPI(title="Survey Service", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def translate_abstract(abstract: str) -> str:
    """OpenAI를 사용한 초록 번역"""
    if not openai_client:
        return "번역 서비스를 사용할 수 없습니다."
    
    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "당신은 학술 논문을 번역하는 전문 번역가입니다. 영어 초록을 자연스러운 한국어로 번역해주세요."},
                {"role": "user", "content": f"다음 논문 초록을 한국어로 번역해주세요:\n\n{abstract}"}
            ],
            max_tokens=500
        )
        return response.choices[0].message.content
    except:
        return "번역에 실패했습니다."

def get_llm_recommendations(description: str, difficulty: str, existing_surveys: List[Survey]) -> str:
    """LLM을 사용한 추천 쿼리 생성"""
    if not openai_client:
        return description
    
    try:
        survey_context = "\n".join([f"- {s.title}" for s in existing_surveys[:5]])
        
        prompt = f"""사용자가 다음과 같은 설명으로 survey 논문을 찾고 있습니다:
"{description}"

난이도: {difficulty}

이미 추천된 논문들:
{survey_context if survey_context else "없음"}

사용자에게 적합한 ArXiv 검색 쿼리를 3-5개 키워드로 생성해주세요. 영어로만 응답하세요."""

        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an AI research assistant helping find relevant survey papers."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100
        )
        
        return response.choices[0].message.content.strip()
    except:
        return description

# 엔드포인트
@app.get("/")
def read_root():
    return {"service": "Survey Service", "status": "running"}

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
            "added_at": us.added_at,
            "completed_at": us.completed_at,
            "survey": survey
        }
        result.append(us_dict)
    
    return result

@app.get("/surveys/{survey_id}", response_model=SurveyResponse)
async def get_survey(
    survey_id: int,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """특정 Survey 상세 정보"""
    survey = db.query(Survey).filter(Survey.id == survey_id).first()
    
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Survey not found"
        )
    
    return survey

@app.post("/surveys/add", response_model=UserSurveyResponse)
async def add_survey_to_user(
    user_survey: UserSurveyCreate,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """사용자에게 Survey 추가"""
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
    """Survey 상태 업데이트"""
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
        from datetime import datetime
        user_survey.completed_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Status updated successfully"}

@app.post("/recommend/custom", response_model=List[SurveyResponse])
async def custom_recommend(
    request: CustomRecommendRequest,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """사용자 설정 추천"""
    user_id = user_data["user_id"]
    
    # 이미 추천된 논문 가져오기
    existing_surveys = db.query(Survey).join(UserSurvey).filter(
        UserSurvey.user_id == user_id
    ).all()
    
    # LLM으로 검색 쿼리 개선
    search_query = get_llm_recommendations(
        request.description, 
        request.difficulty.value,
        existing_surveys
    )
    
    # ArXiv 검색
    arxiv_results = scraper.search_surveys(search_query, max_results=10)
    
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
            # 번역 및 읽기 시간 추정
            translation = translate_abstract(result["abstract"])
            reading_times = scraper.estimate_reading_time(result["abstract"])
            
            # 새 Survey 생성
            new_survey = Survey(
                arxiv_id=result["arxiv_id"],
                title=result["title"],
                abstract=result["abstract"],
                abstract_translation=translation,
                authors=result["authors"],
                published_date=result["published_date"],
                pdf_url=result["pdf_url"],
                categories=result["categories"],
                difficulty_level=request.difficulty.value,
                estimated_reading_time_beginner=reading_times["beginner"],
                estimated_reading_time_intermediate=reading_times["intermediate"],
                estimated_reading_time_advanced=reading_times["advanced"]
            )
            
            db.add(new_survey)
            db.commit()
            db.refresh(new_survey)
            
            survey_responses.append(new_survey)
    
    return survey_responses[:10]

@app.post("/recommend/end-to-end", response_model=List[SurveyResponse])
async def end_to_end_recommend(
    request: EndToEndRecommendRequest,
    user_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """엔드 투 엔드 추천"""
    # AI 스택과 도메인을 결합한 검색 쿼리 생성
    all_keywords = request.ai_stacks + request.domains
    
    if request.custom_stack:
        all_keywords.append(request.custom_stack)
    if request.custom_domain:
        all_keywords.append(request.custom_domain)
    
    query = " ".join(all_keywords)
    
    # ArXiv 검색
    arxiv_results = scraper.search_surveys(query, max_results=request.max_results)
    
    # DB에 저장 및 반환
    survey_responses = []
    for result in arxiv_results:
        existing_survey = db.query(Survey).filter(
            Survey.arxiv_id == result["arxiv_id"]
        ).first()
        
        if existing_survey:
            survey_responses.append(existing_survey)
        else:
            translation = translate_abstract(result["abstract"])
            reading_times = scraper.estimate_reading_time(result["abstract"])
            
            new_survey = Survey(
                arxiv_id=result["arxiv_id"],
                title=result["title"],
                abstract=result["abstract"],
                abstract_translation=translation,
                authors=result["authors"],
                published_date=result["published_date"],
                pdf_url=result["pdf_url"],
                categories=result["categories"],
                difficulty_level=request.difficulty.value,
                estimated_reading_time_beginner=reading_times["beginner"],
                estimated_reading_time_intermediate=reading_times["intermediate"],
                estimated_reading_time_advanced=reading_times["advanced"],
                tags=", ".join(all_keywords)
            )
            
            db.add(new_survey)
            db.commit()
            db.refresh(new_survey)
            
            survey_responses.append(new_survey)
    
    return survey_responses