import json
import redis
from django.conf import settings

_redis = redis.Redis.from_url(settings.CACHES['default']['LOCATION'])

CHANNEL_PREFIX = 'poll-updates:'

def publish_poll_update(poll_id: int, payload: dict):
    channel = f"{CHANNEL_PREFIX}{poll_id}"
    _redis.publish(channel, json.dumps(payload))

def get_channel(poll_id: int) -> str:
    return f"{CHANNEL_PREFIX}{poll_id}"

