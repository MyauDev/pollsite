from __future__ import annotations

import logging
import time
from typing import Dict

from django.db import transaction, IntegrityError
from django.db.models import (
    Q, F, Value, Case, When, FloatField, Exists, OuterRef, ExpressionWrapper,
)
from django.db.models.functions import Coalesce, Ln, Exp, Now, Extract, Cast
from django.utils import timezone
from django.core.cache import cache

from rest_framework import status as http
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from polls.models import Poll, PollOption, Vote, VisibilityMode, PollTopic, FollowTopic, FollowAuthor
from lib.http_helpers.pagination import FeedCursorPagination
from polls.serializers import (
    PollBaseSerializer,
    PollDetailSerializer,
    PollWriteSerializer,
)
from polls.permissions import IsAuthorOrReadOnly
from lib.redis.pubsub import publish_poll_update
from lib.utils.network import get_client_ip, sha256_hex

logger = logging.getLogger(__name__)

# ranking weights
W_TREND = 0.6
W_FRESH = 0.4
W_INTEREST = 0.5

# vote limits
RATE_LIMIT_IP_PER_MIN = 60
RATE_LIMIT_DEV_PER_MIN = 60
COOKIE_DEVICE_KEY = "did"
COOKIE_MAX_AGE = 60 * 60 * 24 * 365  # 1 year


class PollViewSet(ModelViewSet):
    """
    Endpoints for polls:

    - GET    /polls/                — ranked feed (public)
    - GET    /polls/{id}/           — details (public)
    - POST   /polls/                — create (author = request.user)
    - PATCH  /polls/{id}/           — update (owner or moderator)
    - DELETE /polls/{id}/           — delete (owner or moderator)
    - POST   /polls/{id}/vote/      — cast a vote (public, rate-limited)
    """
    queryset = Poll.objects.select_related("stats", "author").prefetch_related("options", "polltopic_set__topic")
    pagination_class = FeedCursorPagination

    def get_permissions(self):
        if self.action in ("create",):
            return [IsAuthenticated()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsAuthorOrReadOnly()]
        if self.action == "vote":
            return [AllowAny()]
        return [AllowAny()]  # list/retrieve

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PollWriteSerializer
        return PollDetailSerializer if self.action == "retrieve" else PollBaseSerializer

    # ---------- Feed (list) ----------

    def list(self, request, *args, **kwargs):
        """
        Ranked feed of public polls with optional filters (?topic_id=..., ?author_id=...).
        """
        user = request.user if getattr(request, "user", None) and request.user.is_authenticated else None

        qs = (
            Poll.objects.select_related("stats")
            .prefetch_related("options", "polltopic_set__topic")
            .filter(visibility=VisibilityMode.PUBLIC)
            .annotate(total_votes=Coalesce(F("stats__total_votes"), Value(0)))
        )

        # Age (hours) = (now - created_at) / 3600
        age_seconds = Extract(Now() - F("created_at"), "epoch")
        age_hours = ExpressionWrapper(age_seconds / Value(3600.0), output_field=FloatField())

        fresh = Exp(-age_hours / Value(24.0))  # exp(-age/24)
        trend = Ln(Value(1.0) + Cast(F("total_votes"), FloatField()))  # ln(1 + votes)

        if user:
            # topic match: any topic followed by the user?
            pt_subq = PollTopic.objects.filter(
                poll_id=OuterRef("pk"),
                topic_id__in=FollowTopic.objects.filter(user=user).values("topic_id"),
            )
            has_topic_match = Exists(pt_subq)

            # author match: author followed by the user?
            has_author_match = Exists(FollowAuthor.objects.filter(user=user, author_id=OuterRef("author_id")))

            interest = (
                Case(When(has_author_match, then=Value(1.0)), default=Value(0.0), output_field=FloatField())
                + Case(When(has_topic_match, then=Value(1.0)), default=Value(0.0), output_field=FloatField())
            )
        else:
            interest = Value(0.0)

        score = W_TREND * trend + W_FRESH * fresh + W_INTEREST * interest
        qs = qs.annotate(score=score)

        # Optional filters
        topic_id = request.query_params.get("topic_id")
        author_id = request.query_params.get("author_id")
        if topic_id:
            qs = qs.filter(polltopic__topic_id=topic_id)
        if author_id:
            qs = qs.filter(author_id=author_id)

        qs = qs.order_by("-score", "-created_at", "-id")
        page = self.paginate_queryset(qs)
        ser = PollBaseSerializer(page, many=True, context={"request": request})
        return self.get_paginated_response(ser.data)

    # ---------- Write (create/update/destroy) ----------

    def perform_create(self, serializer: PollWriteSerializer):
        serializer.save(author=self.request.user)

    # ---------- Vote (action) ----------

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[AllowAny],
        authentication_classes=[],  # allow cookie-less/CSRF-less clients
        url_path="vote",
    )
    def vote(self, request, pk=None):
        """
        Cast a vote for a poll option:
          body: {"option_id": <int>}
        Enforces one vote per poll per user/device/ip. Applies simple rate limits.
        Returns fresh aggregated counts/percents and sets a client device cookie if needed.
        """
        try:
            poll = Poll.objects.select_related("stats").get(pk=int(pk))
        except (Poll.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Poll not found"}, status=http.HTTP_404_NOT_FOUND)

        option_id = (request.data or {}).get("option_id")
        if not option_id:
            return Response({"detail": "`option_id` is required"}, status=http.HTTP_400_BAD_REQUEST)

        try:
            option = PollOption.objects.get(pk=int(option_id), poll=poll)
        except (PollOption.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Option does not belong to this poll"}, status=http.HTTP_400_BAD_REQUEST)

        # Active check
        now = timezone.now()
        if poll.is_hidden or poll.is_frozen or (poll.closes_at and now >= poll.closes_at):
            return Response({"detail": "Poll is closed or unavailable"}, status=http.HTTP_403_FORBIDDEN)

        # Identity
        user = request.user if getattr(request, "user", None) and request.user.is_authenticated else None
        ip = get_client_ip(request)
        ip_hash = sha256_hex(ip) if ip else None

        device_id = request.headers.get("X-Device-Id") or request.COOKIES.get(COOKIE_DEVICE_KEY)
        set_cookie_device = False
        if not device_id:
            import secrets
            device_id = secrets.token_urlsafe(16)
            set_cookie_device = True
        device_hash = sha256_hex(device_id)

        # Rate limits
        if ip_hash and not self._rate_limit(f"ip:{ip_hash}", RATE_LIMIT_IP_PER_MIN):
            return Response({"detail": "Too many requests from this IP"}, status=http.HTTP_429_TOO_MANY_REQUESTS)
        if device_hash and not self._rate_limit(f"dev:{device_hash}", RATE_LIMIT_DEV_PER_MIN):
            return Response({"detail": "Too many requests from this device"}, status=http.HTTP_429_TOO_MANY_REQUESTS)

        # Idempotency
        idem = (request.headers.get("Idempotency-Key") or "")[:64]
        if idem:
            existing_by_idem = Vote.objects.filter(idempotency_key=idem, poll=poll).only("option_id").first()
            if existing_by_idem:
                return self._response_with_stats(
                    poll,
                    existing_by_idem.option_id,
                    already_voted=True,
                    idempotent=True,
                    set_cookie_device=set_cookie_device,
                    device_id=device_id,
                )

        # Already voted? (by user/device/ip)
        q = Vote.objects.filter(poll=poll)
        cond = Q()
        if user:
            cond |= Q(user=user)
        if device_hash:
            cond |= Q(device_hash=device_hash)
        if ip_hash:
            cond |= Q(ip_hash=ip_hash)
        existing = q.filter(cond).only("option_id").first() if cond.children else None
        if existing:
            return self._response_with_stats(
                poll,
                existing.option_id,
                already_voted=True,
                idempotent=False,
                set_cookie_device=set_cookie_device,
                device_id=device_id,
            )

        # Create vote (handle races/constraints)
        try:
            with transaction.atomic():
                Vote.objects.create(
                    poll=poll,
                    option=option,
                    user=user,
                    ip_hash=ip_hash or None,
                    device_hash=device_hash or None,
                    idempotency_key=idem or None,
                )
        except IntegrityError:
            # Unique constraint hit — treat as "already voted"
            return self._response_with_stats(
                poll,
                option.id,
                already_voted=True,
                idempotent=bool(idem),
                set_cookie_device=set_cookie_device,
                device_id=device_id,
            )

        # Success
        return self._response_with_stats(
            poll,
            option.id,
            already_voted=False,
            idempotent=bool(idem),
            set_cookie_device=set_cookie_device,
            device_id=device_id,
        )

    # ---------- Helpers ----------

    def _rate_limit(self, key: str, limit: int, window_seconds: int = 60) -> bool:
        bucket = int(time.time() // window_seconds)
        cache_key = f"rl:{key}:{bucket}"
        current = cache.get(cache_key)
        if current is None:
            added = cache.add(cache_key, 1, timeout=window_seconds)
            if not added:
                try:
                    current = cache.incr(cache_key)
                except Exception:
                    return False
                return current <= limit
            return True
        try:
            current = cache.incr(cache_key)
        except Exception:
            return False
        return current <= limit

    def _response_with_stats(
        self,
        poll: Poll,
        chosen_option_id: int,
        *,
        already_voted: bool,
        idempotent: bool,
        set_cookie_device: bool,
        device_id: str,
    ) -> Response:
        from django.db.models import Count

        agg = Vote.objects.filter(poll=poll).values("option_id").annotate(c=Count("id"))
        counts: Dict[int, int] = {row["option_id"]: row["c"] for row in agg}
        total = sum(counts.values()) or 0
        percents = {opt_id: round((count / total) * 100, 2) if total else 0.0 for opt_id, count in counts.items()}

        payload = {
            "poll_id": poll.id,
            "voted_option_id": int(chosen_option_id),
            "already_voted": bool(already_voted),
            "idempotent": bool(idempotent),
            "total_votes": int(total),
            "counts": counts,
            "percents": percents,
        }

        if not already_voted:
            try:
                publish_poll_update(poll.id, payload)
            except Exception:
                logger.exception("publish_poll_update failed for poll_id=%s", poll.id)

        resp = Response(payload, status=http.HTTP_200_OK)
        if set_cookie_device and device_id:
            resp.set_cookie(COOKIE_DEVICE_KEY, device_id, max_age=COOKIE_MAX_AGE, httponly=False, samesite="Lax")
        return resp
