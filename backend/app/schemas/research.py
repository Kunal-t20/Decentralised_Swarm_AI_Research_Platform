from datetime import datetime
from typing import List, Dict, Any
from pydantic import BaseModel, ConfigDict

class ResearchJobCreate(BaseModel):
    topic: str

class ResearchJobResponse(BaseModel):
    id: str
    topic: str
    status: str
    loop_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ResearchReportResponse(BaseModel):
    id: int
    job_id: str
    content: str
    sources: List[Dict[str, Any]]
    critic_scores: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ResearchStatusResponse(BaseModel):
    id: str
    topic: str
    status: str
    loop_count: int
    events: List[Dict[str, Any]]
    report: ResearchReportResponse | None = None

    model_config = ConfigDict(from_attributes=True)
