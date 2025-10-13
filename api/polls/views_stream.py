# polls/views_stream.py
import json
import logging
from typing import Dict

from django.http import StreamingHttpResponse, Http404
from django.db.models import Count
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .models import Poll, Vote
from lib.redis.pubsub import get_redis, CHANNEL_FMT
from lib.renderers.sse import EventStreamRenderer, IgnoreClientNegotiation

logger = logging.getLogger("polls.stream")

PING_INTERVAL = 15
RETRY_MS = 3000


def _format_sse(data: dict, *, event: str | None = None, id: str | None = None) -> str:
    """
    Build a single SSE frame. Caller is responsible for UTF-8 encoding.
    """
    lines = []
    if event:
        lines.append(f"event: {event}")
    if id:
        lines.append(f"id: {id}")
    lines.append("data: " + json.dumps(data, ensure_ascii=False))
    lines.append("")  # trailing newline separator
    return "\n".join(lines)


def _snapshot(poll_id: int) -> Dict:
    """
    Lightweight vote snapshot used as initial state for the stream.
    """
    agg = Vote.objects.filter(poll_id=poll_id).values("option_id").annotate(c=Count("id"))
    counts = {row["option_id"]: row["c"] for row in agg}
    total = sum(counts.values())
    perc = {k: round((v / total) * 100, 2) if total else 0.0 for k, v in counts.items()}
    return {"poll_id": poll_id, "total_votes": total, "counts": counts, "percents": perc}


class PollStreamView(APIView):
    """
    SSE endpoint for poll updates.
    - Emits 'snapshot' once on connect.
    - Passes through named events published to Redis (payload {"event": "...", "data": {...}}).
    - Emits ': ping' comments every PING_INTERVAL seconds to keep the connection alive.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    # --- ключевые строки, чтобы не было 406 ---
    renderer_classes = [EventStreamRenderer]
    content_negotiation_class = IgnoreClientNegotiation
    # ------------------------------------------

    def get(self, request, pk: int):
        logger.debug("SSE GET start: pk=%s", pk)
        if not Poll.objects.only("id").filter(pk=pk).exists():
            raise Http404("poll not found")

        r = get_redis()
        ps = r.pubsub()
        channel = CHANNEL_FMT.format(poll_id=pk)

        try:
            logger.debug("Subscribing to channel %r", channel)
            ps.subscribe(channel)
        except Exception:
            logger.exception("Redis subscribe failed on %r", channel)

            def fail_stream():
                yield f"retry: {RETRY_MS}\n\n".encode("utf-8")
                yield (_format_sse({"error": "redis_unavailable"}, event="error") + "\n").encode("utf-8")

            resp = StreamingHttpResponse(fail_stream(), content_type="text/event-stream; charset=utf-8")
            resp["Cache-Control"] = "no-cache"
            resp["X-Accel-Buffering"] = "no"
            return resp

        def event_stream():
            logger.info("SSE opened poll=%s channel=%s", pk, channel)
            try:
                # reconnection advice for EventSource
                yield f"retry: {RETRY_MS}\n\n".encode("utf-8")

                # initial snapshot
                try:
                    snap = _snapshot(pk)
                    logger.debug("Snapshot %s", snap)
                    yield (_format_sse(snap, event="snapshot") + "\n").encode("utf-8")
                except Exception:
                    logger.exception("snapshot() failed for %s", pk)
                    yield (_format_sse({"error": "snapshot_failed"}, event="error") + "\n").encode("utf-8")

                # main loop
                while True:
                    # blocking poll with ping interval
                    msg = ps.get_message(ignore_subscribe_messages=True, timeout=PING_INTERVAL)
                    if msg and msg.get("type") == "message":
                        data = msg.get("data")
                        if isinstance(data, (bytes, bytearray)):
                            try:
                                data = data.decode("utf-8")
                            except Exception:
                                logger.exception("decode failed: %r", data)
                                data = '{"error":"decode_failed"}'
                        try:
                            payload = json.loads(data)
                        except Exception:
                            logger.exception("bad JSON: %r", data)
                            payload = {"raw": data, "note": "bad_json"}

                        # pass-through structured events if present
                        if isinstance(payload, dict) and "event" in payload and "data" in payload:
                            ev_name = payload.get("event") or "update"
                            ev_data = payload.get("data", {})
                            yield (_format_sse(ev_data, event=ev_name) + "\n").encode("utf-8")
                        else:
                            # legacy: emit everything as 'update'
                            yield (_format_sse(payload, event="update") + "\n").encode("utf-8")
                    else:
                        # heartbeat to prevent proxy timeouts
                        yield b": ping\n\n"
            finally:
                try:
                    ps.close()
                    logger.debug("pubsub closed for %s", pk)
                except Exception:
                    logger.exception("close pubsub failed for %s", pk)

        resp = StreamingHttpResponse(event_stream(), content_type="text/event-stream; charset=utf-8")
        resp["Cache-Control"] = "no-cache"
        resp["X-Accel-Buffering"] = "no"
        logger.debug("SSE response headers set for poll=%s", pk)
        return resp
