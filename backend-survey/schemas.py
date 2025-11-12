from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

class DifficultyLevel(str, Enum):
    beginner = "새싹"
    intermediate = "묘목"
    advanced = "나무"

class SurveyStatus(str, Enum):
    recommended = "recommended"
    reading = "reading"
    completed = "completed"

class SurveyCreate(BaseModel):
    arxiv_id: str
    title: str
    abstract: Optional[str] = None
    abstract_translation: Optional[str] = None
    authors: Optional[str] = None
    published_date: Optional[date] = None
    pdf_url: Optional[str] = None
    categories: Optional[str] = None
    difficulty_level: Optional[str] = None
    estimated_reading_time_beginner: Optional[int] = None
    estimated_reading_time_intermediate: Optional[int] = None
    estimated_reading_time_advanced: Optional[int] = None
    tags: Optional[str] = None

class SurveyResponse(BaseModel):
    id: int
    arxiv_id: str
    title: str
    abstract: Optional[str]
    abstract_translation: Optional[str]
    authors: Optional[str]
    published_date: Optional[date]
    pdf_url: Optional[str]
    categories: Optional[str]
    difficulty_level: Optional[str]
    estimated_reading_time_beginner: Optional[int]
    estimated_reading_time_intermediate: Optional[int]
    estimated_reading_time_advanced: Optional[int]
    tags: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserSurveyCreate(BaseModel):
    survey_id: int
    status: SurveyStatus = SurveyStatus.recommended

class UserSurveyResponse(BaseModel):
    id: int
    user_id: int
    survey_id: int
    status: str
    added_at: datetime
    completed_at: Optional[datetime]
    survey: Optional[SurveyResponse] = None
    
    class Config:
        from_attributes = True

class CustomRecommendRequest(BaseModel):
    difficulty: DifficultyLevel
    description: str

class EndToEndRecommendRequest(BaseModel):
    difficulty: DifficultyLevel
    ai_stacks: List[str]
    domains: List[str]
    custom_stack: Optional[str] = None
    custom_domain: Optional[str] = None
    max_results: int = 10