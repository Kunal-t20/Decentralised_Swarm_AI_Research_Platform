import json
from app.core.database import redis_client

def emit(
    job_id: str,
    event_type: str,
    agent: str | None = None,
    tier_used: int | None = None,
    message: str = "",
    data: dict | None = None,
):
    key = f"events:{job_id}"
    event_id = redis_client.incr(f"events:{job_id}:seq")
    event = {
        "event_id": event_id,
        "event_type": event_type,
        "agent": agent,
        "tier_used": tier_used,
        "message": message,
        "data": data or {},
    }
    redis_client.rpush(key, json.dumps(event))
    redis_client.expire(key, 3600)  # default TTL of 1 hour

def get_events_since(job_id: str, since: int = 0) -> list[dict]:
    raw = redis_client.lrange(f"events:{job_id}", since, -1)
    return [json.loads(r) for r in raw]
