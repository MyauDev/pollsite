import os
import json
import redis

# try to import async client (redis>=4.2)
try:
    from redis.asyncio import from_url as aio_from_url
except Exception:
    aio_from_url = None

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CHANNEL_FMT = os.getenv("CHANNEL_FMT", "polls:updates:{poll_id}")

# lazy singletons
_sync_client = None
_async_client = None


def get_redis():
    """Return sync Redis client used for publishing."""
    global _sync_client
    if _sync_client is None:
        # decode_responses=False is fine; we serialize JSON ourselves
        _sync_client = redis.from_url(REDIS_URL)
    return _sync_client


def get_redis_async():
    """Return async Redis client (used by async views, if any)."""
    if aio_from_url is None:
        raise ImportError("redis.asyncio is unavailable — install package 'redis>=4.2'")
    global _async_client
    if _async_client is None:
        # decode_responses=True to get str payloads directly in listeners
        _async_client = aio_from_url(REDIS_URL, decode_responses=True)
    return _async_client


def publish_poll_update(poll_id: int, payload: dict) -> int:
    """
    Publish raw JSON payload to channel 'polls:updates:{poll_id}'.
    Returns number of subscribers that received the message.
    """
    r = get_redis()
    channel = CHANNEL_FMT.format(poll_id=poll_id)
    message = json.dumps(payload, ensure_ascii=False)
    return r.publish(channel, message)


def publish_event(poll_id: int, event: str, data: dict) -> int:
    """
    Publish a structured SSE event:
    {
      "event": "<event-name>",
      "data": <dict>
    }
    """
    payload = {"event": event, "data": data}
    return publish_poll_update(poll_id, payload)
