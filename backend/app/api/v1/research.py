from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db, redis_client
from app.core.security import get_current_user
from app.models.user import User
from app.models.research import ResearchJob, ResearchReport
from app.schemas.research import ResearchJobCreate, ResearchJobResponse, ResearchStatusResponse, ResearchReportResponse
from app.services.events_service import emit, get_events_since
from app.tasks.swarm_tasks import run_research_swarm
from app.core.rate_limit import SlidingWindowRateLimiter

router = APIRouter(prefix="/research", tags=["research"])


@router.post("", response_model=ResearchJobResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(SlidingWindowRateLimiter(limit=10, window_seconds=60))])
def create_research_job(
    payload: ResearchJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Create DB record
    job = ResearchJob(
        user_id=current_user.id,
        topic=payload.topic,
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # 2. Emit initial event log in Redis
    emit(
        job_id=job.id,
        event_type="NODE_START",
        message=f"Research job created for topic: '{payload.topic}'"
    )
    
    # 3. Queue the background task
    run_research_swarm.delay(job.id, payload.topic)
    
    return job

@router.get("", response_model=list[ResearchJobResponse])
def list_research_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(ResearchJob).filter(ResearchJob.user_id == current_user.id).all()

@router.get("/{job_id}", response_model=ResearchStatusResponse)
def get_research_status(
    job_id: str,
    since: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate job ownership
    job = db.query(ResearchJob).filter(ResearchJob.id == job_id, ResearchJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research job not found"
        )
        
    # Get events from Redis
    events = get_events_since(job_id, since)
    
    # Get report if completed
    report = None
    if job.status == "completed":
        report = db.query(ResearchReport).filter(ResearchReport.job_id == job_id).first()
        
    return {
        "id": job.id,
        "topic": job.topic,
        "status": job.status,
        "loop_count": job.loop_count,
        "events": events,
        "report": report
    }

@router.get("/{job_id}/report", response_model=ResearchReportResponse)
def get_research_report(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(ResearchJob).filter(ResearchJob.id == job_id, ResearchJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research job not found"
        )
    if job.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Research job is not completed yet"
        )
        
    report = db.query(ResearchReport).filter(ResearchReport.job_id == job_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not generated"
        )
    return report

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_research_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(ResearchJob).filter(ResearchJob.id == job_id, ResearchJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research job not found"
        )
        
    # Delete job (cascades database deletes for reports/logs)
    db.delete(job)
    db.commit()
    
    # Clean up Redis keys
    try:
        redis_client.delete(f"events:{job_id}")
        redis_client.delete(f"events:{job_id}:seq")
    except Exception as e:
        print(f"Warning: Failed to delete Redis keys for job {job_id}: {e}")
        
    return
