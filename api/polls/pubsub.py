import os
import json
import redis

# пробуем подтянуть async-клиент (redis>=4.2)
try:
    from redis.asyncio import from_url as aio_from_url
except Exception:
    aio_from_url = None

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CHANNEL_FMT = os.getenv("CHANNEL_FMT", "polls:updates:{poll_id}")

# ленивые синглтоны
_sync_client = None
_async_client = None

def get_redis():
    """Синхронный клиент для фоновых публикаций и т.п."""
    global _sync_client
    if _sync_client is None:
        _sync_client = redis.from_url(REDIS_URL)  # decode_responses не нужен: публикуем строку сами
    return _sync_client

def get_redis_async():
    """Async-клиент для SSE (используется в async-вью)."""
    if aio_from_url is None:
        raise ImportError("redis.asyncio недоступен — поставь пакет 'redis>=4.2'")
    global _async_client
    if _async_client is None:
        # для удобства парсинга сообщений в SSE включим decode_responses
        _async_client = aio_from_url(REDIS_URL, decode_responses=True)
    return _async_client

def publish_poll_update(poll_id: int, payload: dict) -> int:
    """
    Публикует обновление в канал 'polls:updates:{poll_id}'.
    Возвращает количество подписчиков, получивших сообщение.
    """
    r = get_redis()
    channel = CHANNEL_FMT.format(poll_id=poll_id)
    message = json.dumps(payload, ensure_ascii=False)
    return r.publish(channel, message)