import time
import logging
from django.db.models import Count
from django.core.cache import cache
from rest_framework import status as http
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from polls.models import Comment
from polls.serializers import CommentReadSerializer, CommentWriteSerializer
from lib.http_helpers.pagination import CommentsPagination
from lib.utils.network import get_client_ip, sha256_hex
from polls.permissions import IsModerator
from lib.redis.pubsub import publish_event

log = logging.getLogger("polls.comments")

RATE_MIN_PER_IP = 30
RATE_MIN_PER_DEV = 30


class CommentViewSet(GenericViewSet):
    """
    Comments:
      - GET  /polls/{poll_id}/comments/            — list (public, ?parent=<id>)
      - POST /polls/{poll_id}/comments/            — create (public, rate-limited)
      - POST /comments/{id}/moderate/              — hide/unhide (moderator)
    """
    serializer_class = CommentReadSerializer
    pagination_class = CommentsPagination

    # ------- list/create under poll -------

    @action(detail=True, methods=["get"], url_path="comments", permission_classes=[AllowAny])
    def list_for_poll(self, request, pk=None):
        poll_id = pk
        qs = (
            Comment.objects.filter(poll_id=poll_id, status="visible")
            .annotate(replies_count=Count("replies"))
        )
        parent_id = request.query_params.get("parent")
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        else:
            qs = qs.filter(parent__isnull=True)
        qs = qs.order_by("-id")

        page = self.paginate_queryset(qs)
        ser = CommentReadSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(ser.data)

    @action(detail=True, methods=["post"], url_path="comments", permission_classes=[AllowAny], serializer_class=CommentWriteSerializer)
    def create_for_poll(self, request, pk=None):
        ser = CommentWriteSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)

        ip_hash = sha256_hex(get_client_ip(request))
        device_id = request.headers.get("X-Device-Id") or request.COOKIES.get("did") or ""
        device_hash = sha256_hex(device_id)

        if not self._hit_bucket(f"ip:{ip_hash}", RATE_MIN_PER_IP):
            return Response({"detail": "Too Many Requests"}, status=http.HTTP_429_TOO_MANY_REQUESTS)
        if device_hash and not self._hit_bucket(f"dev:{device_hash}", RATE_MIN_PER_DEV):
            return Response({"detail": "Too Many Requests"}, status=http.HTTP_429_TOO_MANY_REQUESTS)

        # Handle soft-moderation flag from serializer.validate_content
        force_hidden = bool(ser.context.get("force_hidden")) if isinstance(ser.context, dict) else False

        obj = ser.save(
            poll_id=pk,
            author=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
            ip_hash=ip_hash or None,
            device_hash=device_hash or None,
            status="hidden" if force_hidden else "visible",
        )

        read = CommentReadSerializer(obj, context={"request": request})
        data = read.data

        try:
            if data.get("status") == "visible":
                publish_event(obj.poll_id, "comment.created", data)
        except Exception:
            log.exception("Failed to publish comment.created")

        return Response(data, status=http.HTTP_201_CREATED)

    # ------- moderation on comment -------

    @action(detail=True, methods=["post"], url_path="moderate", permission_classes=[IsModerator])
    def moderate(self, request, pk=None):
        action_name = (request.data.get("action") or "").lower()
        try:
            c = Comment.objects.get(pk=pk)
        except Comment.DoesNotExist:
            return Response({"detail": "not found"}, status=http.HTTP_404_NOT_FOUND)

        if action_name == "hide":
            c.status = "hidden"
            c.save(update_fields=["status"])
            try:
                publish_event(c.poll_id, "comment.hidden", {"id": c.id, "status": c.status})
            except Exception:
                log.exception("Failed to publish comment.hidden")
            return Response({"ok": True, "status": c.status})

        if action_name == "unhide":
            c.status = "visible"
            c.save(update_fields=["status"])
            try:
                dto = CommentReadSerializer(c, context={"request": request}).data
                publish_event(c.poll_id, "comment.unhidden", dto)
            except Exception:
                log.exception("Failed to publish comment.unhidden")
            return Response({"ok": True, "status": c.status})

        return Response({"detail": "invalid action"}, status=http.HTTP_400_BAD_REQUEST)

    # ------- helpers -------

    def _hit_bucket(self, key: str, limit: int) -> bool:
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
