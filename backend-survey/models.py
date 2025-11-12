from sqlalchemy import Column, Integer, String, DateTime, Text, Date, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class SurveyStatus(enum.Enum):
    recommended = "recommended"
    reading = "reading"
    completed = "completed"

class Survey(Base):
    __tablename__ = "surveys"
    
    id = Column(Integer, primary_key=True, index=True)
    arxiv_id = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(Text, nullable=False)
    abstract = Column(Text)
    abstract_translation = Column(Text)
    authors = Column(Text)
    published_date = Column(Date)
    pdf_url = Column(Text)
    categories = Column(Text)
    difficulty_level = Column(String(20))
    estimated_reading_time_beginner = Column(Integer)
    estimated_reading_time_intermediate = Column(Integer)
    estimated_reading_time_advanced = Column(Integer)
    tags = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

class UserSurvey(Base):
    __tablename__ = "user_surveys"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    survey_id = Column(Integer, nullable=False)
    status = Column(SQLEnum(SurveyStatus), default=SurveyStatus.recommended)
    added_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)