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

from django.db.models import F, Value, Case, When, FloatField, IntegerField, Exists, OuterRef
from django.db.models.functions import Coalesce, Ln, Exp
from django.db.models.expressions import ExpressionWrapper
from django.db.models.functions import Now, Extract
from django.utils import timezone
from .models_follow import FollowTopic, FollowAuthor
from .models import PollTopic


# веса ранжирования
W_TREND = 0.6
W_FRESH = 0.4
W_INTEREST = 0.5


class FeedView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PollBaseSerializer
    pagination_class = FeedCursorPagination


    def get_queryset(self):
        user = self.request.user if getattr(self.request, 'user', None) and self.request.user.is_authenticated else None


        qs = (
            Poll.objects
            .select_related('stats')
            .prefetch_related('options')
            .filter(visibility=VisibilityMode.PUBLIC)
            .filter(ACTIVE_Q)
            .annotate(total_votes=Coalesce(F('stats__total_votes'), Value(0)))
        )


        # Возраст в часах
        age_seconds = Extract(Now() - F('created_at'), 'epoch')
        age_hours = ExpressionWrapper(age_seconds / Value(3600.0), output_field=FloatField())
        # Свежесть: exp(-age/24)
        fresh = Exp(-age_hours / Value(24.0))
        # Тренд: ln(1 + votes)
        trend = Ln(Value(1.0) + Cast(F('total_votes'), FloatField()))


        # Интересы пользователя
        if user:
            # Есть ли совпадение темы опроса с подписками
            user_topics = FollowTopic.objects.filter(user=user, topic_id=OuterRef('topic_id'))
            pt_subq = PollTopic.objects.filter(poll_id=OuterRef('pk'), topic_id__in=FollowTopic.objects.filter(user=user).values('topic_id'))
            has_topic_match = Exists(pt_subq)
            # Подписка на автора
            has_author_match = Exists(FollowAuthor.objects.filter(user=user, author_id=F('author_id')))
            interest = Case(
                When(has_author_match, then=Value(1.0)),
                default=Value(0.0),
                output_field=FloatField(),
            ) + Case(
                When(has_topic_match, then=Value(1.0)),
                default=Value(0.0),
                output_field=FloatField(),
            )
        else:
            interest = Value(0.0)


        score = W_TREND * trend + W_FRESH * fresh + W_INTEREST * interest
        qs = qs.annotate(score=score)


        # Фильтры опционально
        topic_id = self.request.query_params.get('topic_id')
        author_id = self.request.query_params.get('author_id')
        if topic_id:
            qs = qs.filter(polltopic__topic_id=topic_id)
        if author_id:
            qs = qs.filter(author_id=author_id)


        return qs.order_by('-score', '-created_at', '-id')


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