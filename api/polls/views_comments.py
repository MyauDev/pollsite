from django.db.models import Count
from rest_framework import permissions, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

import json
import logging

from .models_comments import Comment
from .models import Poll
from .serializers_comments import CommentReadSerializer, CommentWriteSerializer
from .pagination_comments import CommentsPagination
from .utils import get_client_ip, sha256_hex
from .permissions import IsAuthorOrReadOnly, IsModerator
from .pubsub import publish_event  # publish structured SSE events

# rate limits
from django.core.cache import cache

RATE_MIN_PER_IP = 30
RATE_MIN_PER_DEV = 30

log = logging.getLogger("polls.comments")


class PollCommentsListView(generics.ListAPIView):
    """
    Public list of comments for a poll.
    Supports ?parent=<id> to fetch replies; falls back to root comments.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CommentReadSerializer
    pagination_class = CommentsPagination

    def get_queryset(self):
        poll_id = self.kwargs["poll_id"]
        qs = (
            Comment.objects
            .filter(poll_id=poll_id, status="visible")
            .annotate(replies_count=Count("replies"))
        )
        parent_id = self.request.query_params.get("parent")
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        else:
            qs = qs.filter(parent__isnull=True)
        return qs.order_by("-id")


class CommentCreateView(generics.CreateAPIView):
    """
    Create a new comment. Rate-limited by IP and device.
    Publishes SSE 'comment.created' for visible comments.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CommentWriteSerializer

    def _hit_bucket(self, key: str, limit: int) -> bool:
        """Simple per-minute counter in cache."""
        import time
        bucket = int(time.time() // 60)
        ck = f"cmrl:{key}:{bucket}"
        cur = cache.get(ck)
        if cur is None:
            cache.add(ck, 1, timeout=60)
            return True
        try:
            return cache.incr(ck) <= limit
        except Exception:
            return False

    def perform_create(self, serializer):
        ip_hash = sha256_hex(get_client_ip(self.request))
        device_id = self.request.headers.get("X-Device-Id") or self.request.COOKIES.get("did") or ""
        device_hash = sha256_hex(device_id)

        # rate limit checks
        if not self._hit_bucket(f"ip:{ip_hash}", RATE_MIN_PER_IP):
            raise Exception("rate limited")
        if device_hash and not self._hit_bucket(f"dev:{device_hash}", RATE_MIN_PER_DEV):
            raise Exception("rate limited")

        # optional forced hidden from context
        force_hidden = False
        try:
            force_hidden = bool(serializer.context.get("force_hidden"))
        except Exception:
            force_hidden = False

        obj = serializer.save(
            author=self.request.user if getattr(self.request, "user", None) and self.request.user.is_authenticated else None,
            ip_hash=ip_hash or None,
            device_hash=device_hash or None,
            status="hidden" if force_hidden else "visible",
        )
        self.object = obj

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            self.perform_create(ser)
        except Exception:
            return Response({"detail": "Too Many Requests"}, status=429)

        # public representation
        read = CommentReadSerializer(self.object, context={"request": request})
        data = read.data

        # publish SSE event for visible comment
        try:
            if data.get("status") == "visible":
                publish_event(self.object.poll_id, "comment.created", data)
        except Exception:
            log.exception("Failed to publish comment.created")

        return Response(data, status=status.HTTP_201_CREATED)


class CommentHideView(APIView):
    """
    Hide/unhide a comment (moderator only).
    Publishes SSE:
      - 'comment.hidden'  with {"id": <comment_id>, "status": "hidden"}
      - 'comment.unhidden' with full comment object (so clients can render it)
    """
    permission_classes = [IsModerator]

    def post(self, request, pk: int):
        try:
            c = Comment.objects.get(pk=pk)
        except Comment.DoesNotExist:
            return Response({"detail": "not found"}, status=404)

        action = (request.data.get("action") or "").lower()
        if action == "hide":
            c.status = "hidden"
            c.save(update_fields=["status"])
            try:
                publish_event(c.poll_id, "comment.hidden", {"id": c.id, "status": c.status})
            except Exception:
                log.exception("Failed to publish comment.hidden")
            return Response({"ok": True, "status": c.status})

        elif action == "unhide":
            c.status = "visible"
            c.save(update_fields=["status"])
            try:
                # send full object so clients can show it immediately
                dto = CommentReadSerializer(c, context={"request": request}).data
                publish_event(c.poll_id, "comment.unhidden", dto)
            except Exception:
                log.exception("Failed to publish comment.unhidden")
            return Response({"ok": True, "status": c.status})

        return Response({"detail": "invalid action"}, status=400)
