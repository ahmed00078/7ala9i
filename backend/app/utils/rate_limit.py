from collections import defaultdict
from datetime import datetime, timedelta, timezone


class InMemoryRateLimiter:
    """Per-key sliding-window rate limiter backed by an in-process dict.

    Suitable for single-process deployments. Thread-safe enough for asyncio
    (dict ops are GIL-protected in CPython).
    """

    def __init__(self, max_calls: int, window_seconds: int) -> None:
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._calls: dict[str, list[datetime]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(seconds=self.window_seconds)
        calls = [t for t in self._calls[key] if t > cutoff]
        self._calls[key] = calls
        if len(calls) >= self.max_calls:
            return False
        self._calls[key].append(now)
        return True


# 5 registration attempts per IP per hour
register_limiter = InMemoryRateLimiter(max_calls=5, window_seconds=3600)
