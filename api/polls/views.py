from django.db.models import Count, F, IntegerField, Q, Value
from django.db.models.functions import Coalesce
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.request import Request
from django.utils import timezone

from .models import Poll, Vote, PollStats, VisibilityMode
from .serializers import PollBaseSerializer, PollDetailSerializer
from .pagination import FeedCursorPagination

# Базовое условие "активности" для ленты
ACTIVE_Q = Q(is_hidden=False, is_frozen=False) & (
    Q(closes_at__isnull=True) | Q(closes_at__gt=timezone.now())
)

class FeedView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PollBaseSerializer
    pagination_class = FeedCursorPagination

    def get_queryset(self):
        qs = (
            Poll.objects
            .select_related()
            .prefetch_related('options')
            .filter(visibility=VisibilityMode.PUBLIC,)
            .filter(ACTIVE_Q)
            # джойним статы (через left join) — используем 0 по умолчанию
            .annotate(total_votes=Coalesce(F('stats__total_votes'), Value(0)))
        )

        # Фильтры: тема/автор (MVP)
        topic_id = self.request.query_params.get('topic_id')
        author_id = self.request.query_params.get('author_id')
        if topic_id:
            qs = qs.filter(polltopic__topic_id=topic_id)
        if author_id:
            qs = qs.filter(author_id=author_id)

        # Базовый ранжировщик: активные + свежие + более голосуемые
        # Сначала по свежести, затем по total_votes
        qs = qs.order_by('-created_at', '-total_votes', '-id')
        return qs


class PollDetailView(RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PollDetailSerializer
    lookup_field = 'pk'

    def get_queryset(self):
        return (
            Poll.objects
            .select_related('stats')
            .prefetch_related('options')
        )