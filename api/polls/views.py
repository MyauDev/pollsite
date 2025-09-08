# polls/views.py
from django.db.models import (
    Q,
    F,
    Value,
    Case,
    When,
    FloatField,
    IntegerField,
    Exists,
    OuterRef,
    ExpressionWrapper,
)
from django.db.models.functions import (
    Coalesce,
    Ln,
    Exp,
    Now,
    Extract,
    Cast,   # <-- Cast импортируем отсюда
)

from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
import logging

from .models import Poll, VisibilityMode, PollTopic
from .serializers import PollBaseSerializer, PollDetailSerializer
from .pagination import FeedCursorPagination
from .models_follow import FollowTopic, FollowAuthor

logger = logging.getLogger(__name__)

# веса ранжирования
W_TREND = 0.6
W_FRESH = 0.4
W_INTEREST = 0.5



class FeedView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PollBaseSerializer
    pagination_class = FeedCursorPagination

    def get_queryset(self):
        user = (
            self.request.user
            if getattr(self.request, "user", None) and self.request.user.is_authenticated
            else None
        )
        
        # Debug: Log authentication status
        print(f"FeedView: user={user}, authenticated={getattr(self.request, 'user', None) and self.request.user.is_authenticated}")
        print(f"FeedView: auth headers={dict(self.request.headers)}")

        # Base queryset: public polls only
        qs = (
            Poll.objects.select_related("stats")
            .prefetch_related("options")
            .filter(visibility=VisibilityMode.PUBLIC)
            .annotate(total_votes=Coalesce(F("stats__total_votes"), Value(0)))
        )

        # If you have time-window fields, uncomment and adjust:
        # now = timezone.now()
        # qs = qs.filter(
        #     Q(starts_at__lte=now) &
        #     (Q(ends_at__isnull=True) | Q(ends_at__gt=now))
        # )

        # Age in hours
        age_seconds = Extract(Now() - F("created_at"), "epoch")
        age_hours = ExpressionWrapper(age_seconds / Value(3600.0), output_field=FloatField())

        # Freshness: exp(-age/24)
        fresh = Exp(-age_hours / Value(24.0))

        # Trend: ln(1 + votes)
        trend = Ln(Value(1.0) + Cast(F("total_votes"), FloatField()))

        # User interest (topics/authors) if authenticated
        if user:
            # topic match: does the poll have any topic followed by the user?
            pt_subq = PollTopic.objects.filter(
                poll_id=OuterRef("pk"),
                topic_id__in=FollowTopic.objects.filter(user=user).values("topic_id"),
            )
            has_topic_match = Exists(pt_subq)

            # author match: is the poll's author followed by the user?
            has_author_match = Exists(
                FollowAuthor.objects.filter(user=user, author_id=OuterRef("author_id"))
            )

            interest = (
                Case(
                    When(has_author_match, then=Value(1.0)),
                    default=Value(0.0),
                    output_field=FloatField(),
                )
                + Case(
                    When(has_topic_match, then=Value(1.0)),
                    default=Value(0.0),
                    output_field=FloatField(),
                )
            )
        else:
            interest = Value(0.0)

        score = W_TREND * trend + W_FRESH * fresh + W_INTEREST * interest
        qs = qs.annotate(score=score)

        # Optional filters
        topic_id = self.request.query_params.get("topic_id")
        author_id = self.request.query_params.get("author_id")
        if topic_id:
            qs = qs.filter(polltopic__topic_id=topic_id)
        if author_id:
            qs = qs.filter(author_id=author_id)

        return qs.order_by("-score", "-created_at", "-id")


class PollDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PollDetailSerializer
    lookup_field = "pk"

    def get_queryset(self):
        # Keep it simple here; feed-specific annotations are unnecessary
        return Poll.objects.select_related("stats").prefetch_related("options")