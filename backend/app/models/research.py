import uuid

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ResearchJob(Base):
    __tablename__ = "research_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    topic = Column(String(512), nullable=False)
    status = Column(
        String(50), default="pending", nullable=False
    )  # pending, running, completed, failed

    loop_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    reports = relationship(
        "ResearchReport", back_populates="job", cascade="all, delete-orphan"
    )
    feedback_logs = relationship(
        "FeedbackLog", back_populates="job", cascade="all, delete-orphan"
    )


class ResearchReport(Base):
    __tablename__ = "research_reports"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(
        String(36), ForeignKey("research_jobs.id", ondelete="CASCADE"), nullable=False
    )
    content = Column(Text, nullable=False)
    sources = Column(JSON, default=list, nullable=False)  # JSONB list of sources
    critic_scores = Column(JSON, default=dict, nullable=False)  # JSONB dict of scores
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("ResearchJob", back_populates="reports")


class FeedbackLog(Base):
    __tablename__ = "feedback_logs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(
        String(36), ForeignKey("research_jobs.id", ondelete="CASCADE"), nullable=False
    )
    agent = Column(String(100), nullable=False)  # e.g., "critic"
    score = Column(JSON, nullable=False)  # JSONB critic scores
    feedback = Column(Text, nullable=False)
    loop_iteration = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("ResearchJob", back_populates="feedback_logs")
