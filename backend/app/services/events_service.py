import json
from app.core.database import redis_client, SessionLocal
from app.models import AuditEvent


def emit(
    job_id: str,
    event_type: str,
    agent: str | None = None,
    tier_used: int | None = None,
    message: str = "",
    data: dict | None = None,
):
    event_data = data or {}
    event_id = 0
    try:
        event_id = redis_client.incr(f"events:{job_id}:seq")
        key = f"events:{job_id}"
        event = {
            "event_id": event_id,
            "event_type": event_type,
            "agent": agent,
            "tier_used": tier_used,
            "message": message,
            "data": event_data,
        }
        redis_client.rpush(key, json.dumps(event))
        redis_client.expire(key, 3600)  # default TTL of 1 hour
    except Exception as r_err:
        print(f"Warning: Redis event stream push failed: {r_err}")

    # Dual-write to PostgreSQL for permanent audit retention
    try:
        db = SessionLocal()
        audit_rec = AuditEvent(
            job_id=job_id,
            event_id=event_id,
            event_type=event_type,
            agent=agent,
            tier_used=tier_used,
            message=message,
            data=event_data,
        )
        db.add(audit_rec)
        db.commit()
        db.close()
    except Exception as db_err:
        print(f"Warning: Failed to persist audit event to DB: {db_err}")


def get_events_since(job_id: str, since: int = 0) -> list[dict]:
    # 1. Try Redis fast path first
    try:
        raw = redis_client.lrange(f"events:{job_id}", since, -1)
        if raw:
            return [json.loads(r) for r in raw]
    except Exception as r_err:
        print(f"Warning: Redis get_events_since failed: {r_err}")

    # 2. Fallback to PostgreSQL audit_events if Redis is empty or expired
    try:
        db = SessionLocal()
        records = (
            db.query(AuditEvent)
            .filter(AuditEvent.job_id == job_id, AuditEvent.event_id >= since)
            .order_by(AuditEvent.event_id.asc())
            .all()
        )
        events = [
            {
                "event_id": r.event_id,
                "event_type": r.event_type,
                "agent": r.agent,
                "tier_used": r.tier_used,
                "message": r.message,
                "data": r.data or {},
            }
            for r in records
        ]
        db.close()
        return events
    except Exception as db_err:
        print(f"Warning: PostgreSQL get_events_since fallback failed: {db_err}")
        return []

