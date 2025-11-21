from sqlalchemy import Column, Integer, String, DateTime, Text, Date, Enum as SQLEnum, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class SurveyStatus(enum.Enum):
    saved = "saved"  # 직접 검색으로 저장한 논문
    recommended = "recommended"  # 사용자 기반 추천으로 저장한 논문
    reading = "reading"
    completed = "completed"

class Survey(Base):
    __tablename__ = "surveys"

    id = Column(Integer, primary_key=True, index=True)
    arxiv_id = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(Text, nullable=False)
    abstract = Column(Text)
    keywords = Column(Text)
    authors = Column(Text)
    published_date = Column(Date)
    pdf_url = Column(Text)
    categories = Column(Text)
    difficulty_level = Column(String(20))
    estimated_reading_time_beginner = Column(Integer)
    estimated_reading_time_intermediate = Column(Integer)
    estimated_reading_time_advanced = Column(Integer)
    tags = Column(Text)
    view_count = Column(Integer, default=0)
    citation_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

class UserSurvey(Base):
    __tablename__ = "user_surveys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    survey_id = Column(Integer, nullable=False)
    status = Column(SQLEnum(SurveyStatus), default=SurveyStatus.saved)
    is_starred = Column(Boolean, default=False)
    added_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

class UserActivity(Base):
    """사용자의 일별 활동 기록 (스트릭용)"""
    __tablename__ = "user_activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    activity_date = Column(Date, nullable=False, index=True)
    survey_views = Column(Integer, default=0)  # 해당 날짜에 조회한 논문 수
    created_at = Column(DateTime, server_default=func.now())