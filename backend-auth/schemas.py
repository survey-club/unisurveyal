from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    nickname: Optional[str] = None
    interest_fields: Optional[List[str]] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    nickname: Optional[str] = None
    interest_fields: Optional[str] = None
    profile_image: Optional[str] = None
    background_image: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None

class UserPreferenceCreate(BaseModel):
    preferred_difficulty: Optional[str] = None
    ai_stacks: Optional[str] = None
    domains: Optional[str] = None
    keywords: Optional[str] = None

class UserPreferenceResponse(BaseModel):
    id: int
    user_id: int
    preferred_difficulty: Optional[str]
    ai_stacks: Optional[str]
    domains: Optional[str]
    keywords: Optional[str]
    
    class Config:
        from_attributes = True