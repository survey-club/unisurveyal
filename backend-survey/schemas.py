from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

class DifficultyLevel(str, Enum):
    beginner = "새싹"
    intermediate = "묘목"
    advanced = "나무"

class SurveyStatus(str, Enum):
    saved = "saved"
    recommended = "recommended"
    reading = "reading"
    completed = "completed"

class SurveyCreate(BaseModel):
    arxiv_id: str
    title: str
    abstract: Optional[str] = None
    keywords: Optional[str] = None
    authors: Optional[str] = None
    published_date: Optional[date] = None
    pdf_url: Optional[str] = None
    categories: Optional[str] = None
    difficulty_level: Optional[str] = None
    estimated_reading_time_beginner: Optional[int] = None
    estimated_reading_time_intermediate: Optional[int] = None
    estimated_reading_time_advanced: Optional[int] = None
    tags: Optional[str] = None
    view_count: Optional[int] = 0

class SurveyResponse(BaseModel):
    id: int
    arxiv_id: str
    title: str
    abstract: Optional[str]
    keywords: Optional[str]
    authors: Optional[str]
    published_date: Optional[date]
    pdf_url: Optional[str]
    categories: Optional[str]
    difficulty_level: Optional[str]
    estimated_reading_time_beginner: Optional[int]
    estimated_reading_time_intermediate: Optional[int]
    estimated_reading_time_advanced: Optional[int]
    tags: Optional[str]
    view_count: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class UserSurveyCreate(BaseModel):
    survey_id: int
    status: SurveyStatus = SurveyStatus.saved

class UserSurveyResponse(BaseModel):
    id: int
    user_id: int
    survey_id: int
    status: str
    is_starred: bool
    added_at: datetime
    completed_at: Optional[datetime]
    survey: Optional[SurveyResponse] = None

    class Config:
        from_attributes = True

class InterestFieldsRequest(BaseModel):
    fields: List[str]

class RecommendationResponse(BaseModel):
    survey: SurveyResponse
    similarity_score: Optional[float] = None

    class Config:
        from_attributes = True