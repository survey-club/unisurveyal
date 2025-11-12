from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional
import redis
import json
import os

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
Base.metadata.create_all(bind=engine)

# Redis 클라이언트
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# FastAPI 앱
app = FastAPI(title="Auth Service", version="1.0.0")

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

@app.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # 사용자 존재 확인
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    
    # 새 사용자 생성
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
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