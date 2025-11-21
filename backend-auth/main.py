from fastapi import FastAPI, Depends, HTTPException, status, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional
import redis
import json
import os
from datetime import datetime

from models import Base, User, UserPreference
from schemas import (
    UserCreate, UserLogin, UserResponse, Token, 
    UserPreferenceCreate, UserPreferenceResponse
)
from utils import (
    get_password_hash, verify_password, 
    create_access_token, decode_access_token
)

# 환경 변수
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL")

# 데이터베이스 설정
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis 클라이언트
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# FastAPI 앱
app = FastAPI(title="Auth Service", version="1.0.0")

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
    print(f"🔐 [AUTH] {request.method} {request.url.path}")
    print(f"⏰ Time: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

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

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme"
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    # Redis에서 세션 확인
    session_data = redis_client.get(f"session:{token}")
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )
    
    username = decode_access_token(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

# 엔드포인트
@app.get("/")
def read_root():
    return {"service": "Auth Service", "status": "running"}

@app.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    print(f"📝 New user registration attempt: {user_data.username}")

    # 사용자 존재 확인
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()

    if existing_user:
        print(f"❌ Registration failed: User already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )

    # 새 사용자 생성
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        nickname=user_data.nickname,
        interest_fields=",".join(user_data.interest_fields) if user_data.interest_fields else None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    print(f"✅ User registered successfully: {new_user.username} (ID: {new_user.id})")

    # 토큰 생성
    access_token = create_access_token(data={"sub": new_user.username})

    # Redis에 세션 저장 (7일)
    session_data = {
        "user_id": new_user.id,
        "username": new_user.username,
        "email": new_user.email
    }
    redis_client.setex(
        f"session:{access_token}",
        60 * 60 * 24 * 7,  # 7 days
        json.dumps(session_data)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@app.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    print(f"🔑 Login attempt: {user_data.username}")

    user = db.query(User).filter(User.username == user_data.username).first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        print(f"❌ Login failed: Invalid credentials for {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    print(f"✅ Login successful: {user.username} (ID: {user.id})")
    
    # 토큰 생성
    access_token = create_access_token(data={"sub": user.username})
    
    # Redis에 세션 저장 (7일)
    session_data = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email
    }
    redis_client.setex(
        f"session:{access_token}",
        60 * 60 * 24 * 7,  # 7 days
        json.dumps(session_data)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@app.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:
        scheme, token = authorization.split()
        redis_client.delete(f"session:{token}")
        return {"message": "Logged out successfully"}
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token"
        )

@app.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/verify")
def verify_token(current_user: User = Depends(get_current_user)):
    return {
        "valid": True,
        "user_id": current_user.id,
        "username": current_user.username
    }

@app.post("/preferences", response_model=UserPreferenceResponse)
def create_or_update_preferences(
    pref_data: UserPreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing_pref = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()
    
    if existing_pref:
        # 업데이트
        if pref_data.preferred_difficulty:
            existing_pref.preferred_difficulty = pref_data.preferred_difficulty
        if pref_data.ai_stacks:
            existing_pref.ai_stacks = pref_data.ai_stacks
        if pref_data.domains:
            existing_pref.domains = pref_data.domains
        if pref_data.keywords:
            existing_pref.keywords = pref_data.keywords
        
        db.commit()
        db.refresh(existing_pref)
        return existing_pref
    else:
        # 새로 생성
        new_pref = UserPreference(
            user_id=current_user.id,
            preferred_difficulty=pref_data.preferred_difficulty,
            ai_stacks=pref_data.ai_stacks,
            domains=pref_data.domains,
            keywords=pref_data.keywords
        )
        db.add(new_pref)
        db.commit()
        db.refresh(new_pref)
        return new_pref

@app.get("/preferences", response_model=UserPreferenceResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pref = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).first()

    if not pref:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preferences not found"
        )

    return pref

@app.post("/verify-password")
def verify_password_endpoint(
    password_data: dict,
    current_user: User = Depends(get_current_user)
):
    """비밀번호 확인"""
    password = password_data.get("password")

    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required"
        )

    if not verify_password(password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )

    return {"message": "Password verified successfully"}

@app.get("/user/profile", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """사용자 프로필 조회"""
    return current_user

@app.put("/user/profile", response_model=UserResponse)
def update_user_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """사용자 프로필 업데이트"""
    if "nickname" in profile_data:
        current_user.nickname = profile_data["nickname"]

    if "profile_image" in profile_data:
        current_user.profile_image = profile_data["profile_image"]

    if "background_image" in profile_data:
        current_user.background_image = profile_data["background_image"]

    if "interest_fields" in profile_data:
        fields = profile_data["interest_fields"]
        if isinstance(fields, list):
            current_user.interest_fields = ",".join(fields)
        else:
            current_user.interest_fields = fields

    db.commit()
    db.refresh(current_user)

    # 로컬 스토리지 업데이트를 위해 사용자 정보 반환
    return current_user