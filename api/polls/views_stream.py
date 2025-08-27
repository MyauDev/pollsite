import json, time, logging
from typing import Dict
from django.http import StreamingHttpResponse, Http404
from django.db.models import Count
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from .models import Poll, Vote
from .pubsub import get_redis, CHANNEL_FMT

logger = logging.getLogger("polls.stream")
PING_INTERVAL = 15
RETRY_MS = 3000

def _format_sse(data: dict, *, event: str | None = None, id: str | None = None) -> str:
    lines = []
    if event: lines.append(f"event: {event}")
    if id:    lines.append(f"id: {id}")
    lines.append("data: " + json.dumps(data, ensure_ascii=False))
    lines.append("")
    return "\n".join(lines)

def _snapshot(poll_id: int) -> Dict:
    agg = Vote.objects.filter(poll_id=poll_id).values('option_id').annotate(c=Count('id'))
    counts = {row['option_id']: row['c'] for row in agg}
    total = sum(counts.values())
    perc = {k: round((v/total)*100,2) if total else 0.0 for k,v in counts.items()}
    return {"poll_id": poll_id, "total_votes": total, "counts": counts, "percents": perc}

class PollStreamView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, pk: int):
        logger.debug("SSE GET start: pk=%s", pk)
        if not Poll.objects.only('id').filter(pk=pk).exists():
            raise Http404('poll not found')

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
                yield (_format_sse({"error":"redis_unavailable"}, event="error")+"\n").encode("utf-8")
            resp = StreamingHttpResponse(fail_stream(), content_type='text/event-stream; charset=utf-8')
            resp['Cache-Control'] = 'no-cache'; resp['X-Accel-Buffering'] = 'no'
            return resp

        def event_stream():
            logger.info("SSE opened poll=%s channel=%s", pk, channel)
            try:
                yield f"retry: {RETRY_MS}\n\n".encode("utf-8")
                try:
                    snap = _snapshot(pk); logger.debug("Snapshot %s", snap)
                    yield (_format_sse(snap, event='snapshot')+"\n").encode("utf-8")
                except Exception:
                    logger.exception("snapshot() failed for %s", pk)
                    yield (_format_sse({"error":"snapshot_failed"}, event="error")+"\n").encode("utf-8")
                while True:
                    msg = ps.get_message(ignore_subscribe_messages=True, timeout=PING_INTERVAL)
                    if msg and msg.get('type') == 'message':
                        data = msg.get('data')
                        if isinstance(data,(bytes,bytearray)):
                            try: data = data.decode('utf-8')
                            except Exception:
                                logger.exception("decode failed: %r", data); data = '{"error":"decode_failed"}'
                        try: payload = json.loads(data)
                        except Exception:
                            logger.exception("bad JSON: %r", data); payload = {"raw": data, "note":"bad_json"}
                        yield (_format_sse(payload, event='update')+"\n").encode("utf-8")
                    else:
                        yield b": ping\n\n"
            finally:
                try: ps.close(); logger.debug("pubsub closed for %s", pk)
                except Exception: logger.exception("close pubsub failed for %s", pk)

        resp = StreamingHttpResponse(event_stream(), content_type='text/event-stream; charset=utf-8')
        resp['Cache-Control'] = 'no-cache'; resp['X-Accel-Buffering'] = 'no'
        logger.debug("SSE response headers set for poll=%s", pk)
        return resp