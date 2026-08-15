from app.core.celery_app import celery_app
from app.swarm.graph import swarm_graph
from app.core.database import SessionLocal
from app.models import User, ResearchJob, ResearchReport, FeedbackLog, AuditEvent
from app.services.events_service import emit


@celery_app.task(bind=True, name="app.tasks.swarm_tasks.run_research_swarm", rate_limit="10/m")
def run_research_swarm(self, job_id: str, topic: str):
    db = SessionLocal()
    try:
        # 1. Mark job as running
        emit(
            job_id=job_id,
            event_type="STATUS_CHANGE",
            message="Job picked up by background Celery worker. Starting swarm execution.",
        )

        job = db.query(ResearchJob).filter(ResearchJob.id == job_id).first()
        if not job:
            raise ValueError(f"Research job with id {job_id} not found in database.")
        if job.status not in ["QUEUED", "pending"]:
            print(f"Job {job_id} is already in state '{job.status}'. Skipping duplicate execution.")
            return
        job.status = "RUNNING"
        db.commit()

        # 2. Invoke the LangGraph state machine
        initial_state = {
            "job_id": job_id,
            "topic": topic,
            "loop_count": 0,
            "research_notes": "",
            "analyst_draft": "",
            "critic_feedback": "",
            "critic_scores": {},
            "sources": [],
            "verdict": "",
            "_feedbacks_to_persist": [],
            "draft_history": [],
        }
        config = {"configurable": {"thread_id": job_id}}
        final_state = swarm_graph.invoke(initial_state, config=config)

        # 3. Persist final report
        job = db.query(ResearchJob).filter(ResearchJob.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} disappeared from database during execution.")

        critic_scores = final_state.get("critic_scores", {})
        verdict = final_state.get("verdict", "")
        all_passed = bool(critic_scores) and all(score >= 7.0 for score in critic_scores.values())
        draft_history = final_state.get("draft_history", [])

        if all_passed or verdict == "approve":
            job.status = "COMPLETED"
            final_content = final_state.get("analyst_draft", "")
            final_scores_to_save = critic_scores
            done_message = "Research job successfully completed. Quality criteria met."
        else:
            job.status = "COMPLETED_WITH_WARNING"
            if draft_history:
                best_entry = max(draft_history, key=lambda x: x.get("avg_score", 0.0))
                final_content = best_entry.get("draft", final_state.get("analyst_draft", ""))
                final_scores_to_save = best_entry.get("scores", critic_scores)
            else:
                final_content = final_state.get("analyst_draft", "")
                final_scores_to_save = critic_scores
            done_message = "Research job finished with warning: quality threshold not fully met after maximum revisions."

        job.loop_count = final_state.get("loop_count", 0)

        report = ResearchReport(
            job_id=job_id,
            content=final_content,
            sources=final_state.get("sources", []),
            critic_scores=final_scores_to_save,
        )
        db.add(report)

        # Persist one FeedbackLog row per critic loop iteration (all loops, not just final)
        for feedback_data in final_state.get("_feedbacks_to_persist", []):
            feedback_log = FeedbackLog(
                job_id=job_id,
                agent=feedback_data.get("agent", "critic"),
                score=feedback_data.get("score", {}),
                feedback=feedback_data.get("feedback", ""),
                loop_iteration=feedback_data.get("loop_iteration", 0),
            )
            db.add(feedback_log)

        job.updated_at = db.query(ResearchJob).filter(ResearchJob.id == job_id).first().updated_at
        db.commit()

        emit(
            job_id=job_id,
            event_type="DONE",
            message=done_message,
        )

    except Exception as e:
        db.rollback()
        # Mark job as failed in DB
        try:
            job = db.query(ResearchJob).filter(ResearchJob.id == job_id).first()
            if job:
                job.status = "FAILED"
                db.commit()
        except Exception as db_err:
            print(f"Error updating job status to failed: {db_err}")
            db.rollback()

        emit(
            job_id=job_id,
            event_type="ERROR",
            message=f"Research swarm execution encountered an error: {e}",
        )
        raise e

    finally:
        # Single close point — always runs regardless of code path taken
        db.close()
