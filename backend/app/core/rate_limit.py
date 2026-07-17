import time
from fastapi import Depends, HTTPException, status
from app.core.database import redis_client
from app.models.user import User
from app.api.v1.deps import get_current_user


class SlidingWindowRateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds

    def __call__(self, current_user: User = Depends(get_current_user)):
        key = f"rate_limit:{current_user.id}:{self.window_seconds}"
        current_time = time.time()

        try:
            pipe = redis_client.pipeline()
            # Remove timestamps outside the current sliding window
            pipe.zremrangebyscore(key, "-inf", current_time - self.window_seconds)
            # Count how many requests remain in the window BEFORE this one
            pipe.zcard(key)
            pipe.expire(key, self.window_seconds * 2)
            _, count, _ = pipe.execute()

            # Reject if already at or over limit (do NOT add the blocked attempt)
            if count >= self.limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {self.limit} requests per {self.window_seconds}s allowed.",
                )

            # Only record the timestamp if the request is permitted
            redis_client.zadd(key, {str(current_time): current_time})

        except HTTPException:
            raise
        except Exception as e:
            # Fail open — do not block legitimate requests if Redis is unavailable
            print(f"Warning: Rate limiter Redis error: {e}")

