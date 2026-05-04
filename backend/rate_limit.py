"""Lightweight in-memory rate limiter for FastAPI.

For production-grade limits use Redis, but for our deployment scale (single backend
worker, low traffic) an in-memory sliding-window limiter is sufficient and avoids
adding a Redis dependency.
"""
from __future__ import annotations
import time
from collections import deque
from typing import Deque, Dict, Tuple
from fastapi import HTTPException, Request


_buckets: Dict[Tuple[str, str], Deque[float]] = {}


def _client_key(request: Request) -> str:
    """Identify the client by trusted forwarded IP, falling back to peer."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        # The first entry is the original client
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(scope: str, max_calls: int, window_seconds: int):
    """Dependency factory: limit `max_calls` per `window_seconds` per client+scope."""

    async def _dep(request: Request):
        now = time.monotonic()
        key = (scope, _client_key(request))
        bucket = _buckets.setdefault(key, deque())
        # Drop old timestamps outside the window
        cutoff = now - window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= max_calls:
            retry_after = int(bucket[0] + window_seconds - now) + 1
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(max(retry_after, 1))},
            )
        bucket.append(now)

    return _dep
