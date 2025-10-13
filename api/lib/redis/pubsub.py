from __future__ import annotations

import os
import json
import logging
from typing import Optional, Any

import redis

try:
    # redis>=4.2 provides asyncio client
    from redis.asyncio import from_url as aio_from_url  # type: ignore
except Exception:  # pragma: no cover
    aio_from_url = None  # type: ignore

try:
    from django.conf import settings
except Exception:  # pragma: no cover
    settings = None  # type: ignore

logger = logging.getLogger(__name__)

# --- Configuration ------------------------------------------------------------
def _resolve_redis_url() -> str:
    """Try to resolve Redis URL from Django cache or environment variable."""
    if settings is not None:
        try:
            loc = settings.CACHES["default"]["LOCATION"]
            if loc:
                return loc
        except Exception:
            pass
    return os.getenv("REDIS_URL", "redis://localhost:6379/0")


REDIS_URL = _resolve_redis_url()
CHANNEL_FMT = os.getenv("CHANNEL_FMT", "polls:updates:{poll_id}")

# --- Lazy singletons ----------------------------------------------------------
_sync_client: Optional[redis.Redis] = None
_async_client = None


def get_redis() -> Optional[redis.Redis]:
    """
    Return a synchronous Redis client (lazy initialization).
    Returns None if connection could not be established.
    """
    global _sync_client
    if _sync_client is not None:
        return _sync_client
    try:
        # decode_responses=False — JSON serialization is handled manually
        _sync_client = redis.from_url(REDIS_URL)
        try:
            _sync_client.ping()
        except Exception:
            logger.warning("Redis ping failed; continuing in degraded mode")
        return _sync_client
    except Exception as e:  # pragma: no cover
        logger.error("Redis connection failed: %s", e)
        return None


def get_redis_async():
    """
    Return an asynchronous Redis client (lazy initialization).
    Raises ImportError if asyncio Redis client is unavailable.
    """
    if aio_from_url is None:  # pragma: no cover
        raise ImportError("redis.asyncio is unavailable — install 'redis>=4.2'")
    global _async_client
    if _async_client is not None:
        return _async_client
    _async_client = aio_from_url(REDIS_URL, decode_responses=True)
    return _async_client


def channel_name(poll_id: int) -> str:
    """Return formatted Redis channel name for the given poll ID."""
    return CHANNEL_FMT.format(poll_id=poll_id)


# --- Publishing ---------------------------------------------------------------
def publish_poll_update(poll_id: int, payload: dict[str, Any]) -> int:
    """
    Publish a JSON-encoded payload to the corresponding Redis channel.
    Returns the number of subscribers that received the message.
    Safe: logs and ignores errors if Redis is unavailable.
    """
    r = get_redis()
    if not r:
        logger.warning("publish_poll_update skipped: Redis unavailable")
        return 0

    ch = channel_name(poll_id)
    try:
        msg = json.dumps(payload, ensure_ascii=False)
        n = r.publish(ch, msg)
        logger.debug("Published to %s: %s (subs=%s)", ch, payload, n)
        return int(n or 0)
    except Exception as e:  # pragma: no cover
        logger.error("Failed to publish to %s: %s", ch, e)
        return 0


def publish_event(poll_id: int, event: str, data: dict[str, Any]) -> int:
    """
    Publish a structured Server-Sent Event (SSE) to Redis.
    Example:
    {
        "event": "<event-name>",
        "data": { ... }
    }
    """
    return publish_poll_update(poll_id, {"event": event, "data": data})
