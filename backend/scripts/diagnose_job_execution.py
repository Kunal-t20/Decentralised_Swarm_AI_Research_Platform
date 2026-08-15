import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import time
import json
import traceback
from app.core.database import SessionLocal

from app.models.research import ResearchJob, ResearchReport, AuditEvent
from app.models.user import User
from app.tasks.swarm_tasks import run_research_swarm
from app.swarm.graph import swarm_graph

def test_full_job_execution():
    print("=== STARTING SWARM DIAGNOSTIC RUN ===")
    db = SessionLocal()
    
    # 1. Create a dummy test user
    user = db.query(User).filter(User.email == "diag@swarm.ai").first()
    if not user:
        user = User(email="diag@swarm.ai", hashed_password="hashed_pw_test")
        db.add(user)
        db.commit()
        db.refresh(user)
    print(f"User ID: {user.id}")

    # 2. Create Research Job
    job = ResearchJob(
        user_id=user.id,
        topic="Quantum Computing Advances 2026",
        status="QUEUED"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    print(f"Created Job ID: {job.id}, Status: {job.status}")

    # 3. Directly execute run_research_swarm logic synchronously to catch any error trace
    print("\n--- Invoking run_research_swarm synchronously ---")
    try:
        run_research_swarm(job.id, job.topic)
        print("run_research_swarm returned without throwing exceptions.")
    except Exception as e:
        print("EXCEPTION CAUGHT during run_research_swarm:")
        traceback.print_exc()

    # 4. Check DB results
    db.refresh(job)
    print(f"\nFinal DB Job Status: {job.status}")
    print(f"Final Loop Count: {job.loop_count}")

    report = db.query(ResearchReport).filter(ResearchReport.job_id == job.id).first()
    if report:
        print(f"\n[SUCCESS] ResearchReport found in DB!")
        print(f"Critic Scores: {report.critic_scores}")
        print(f"Sources Count: {len(report.sources)}")
        print(f"Report Content Length: {len(report.content)} chars")
        print("\nReport Content Preview:")
        print(report.content[:400])
    else:
        print(f"\n[FAILURE] No ResearchReport was persisted for job {job.id}!")

    # 5. Check Audit Events
    events = db.query(AuditEvent).filter(AuditEvent.job_id == job.id).order_by(AuditEvent.event_id.asc()).all()
    print(f"\nPersisted Audit Events Count: {len(events)}")
    for evt in events:
        print(f"  [#{evt.event_id}] [{evt.agent or 'SYS'}] {evt.event_type}: {evt.message}")

if __name__ == "__main__":
    test_full_job_execution()
