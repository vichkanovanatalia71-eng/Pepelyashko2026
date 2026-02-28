"""Simple in-memory rate limiter for auth endpoints."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status


class RateLimiter:
    """Token-bucket style rate limiter keyed by client IP."""

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def check(self, request: Request) -> None:
        ip = self._get_client_ip(request)
        now = time.monotonic()
        cutoff = now - self.window_seconds

        # Remove expired entries
        self._requests[ip] = [t for t in self._requests[ip] if t > cutoff]

        if len(self._requests[ip]) >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Забагато запитів. Спробуйте через хвилину.",
            )

        self._requests[ip].append(now)


# Singleton — використовується в auth routes
auth_rate_limiter = RateLimiter()
