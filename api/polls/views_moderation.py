from django.db import transaction
from rest_framework import generics, permissions, status, throttling
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Poll
from .models_report import Report
from .serializers_moderation import (
    ReportCreateSerializer,
    ReportListSerializer,
    ModerationActionSerializer,
    PollModerationQueueSerializer,
)
from .permissions import IsModerator


# Throttling: tune rates for your needs
class ReportAnonRateThrottle(throttling.AnonRateThrottle):
    rate = '5/min'


class ReportUserRateThrottle(throttling.UserRateThrottle):
    rate = '10/min'


class ReportCreateView(generics.CreateAPIView):
    serializer_class = ReportCreateSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ReportAnonRateThrottle, ReportUserRateThrottle]


class ReportListView(generics.ListAPIView):
    serializer_class = ReportListSerializer
    permission_classes = [IsModerator]

    def get_queryset(self):
        return Report.objects.order_by('-created_at')


class ModerationQueueView(generics.ListAPIView):
    """List polls that hit auto-review threshold."""
    permission_classes = [IsModerator]
    serializer_class = PollModerationQueueSerializer

    def get_queryset(self):
        # Hottest first (most reports)
        return Poll.objects.filter(under_review=True).order_by('-reports_total', '-id')


class ModerationActionView(APIView):
    permission_classes = [IsModerator]

    @transaction.atomic
    def post(self, request, poll_id: int):
        ser = ModerationActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action = ser.validated_data['action']

        try:
            # lock poll row for concurrent safety
            poll = Poll.objects.select_for_update().get(pk=poll_id)
        except Poll.DoesNotExist:
            return Response({'detail': 'not found'}, status=status.HTTP_404_NOT_FOUND)

        update_fields = []

        if action == 'hide':
            if not poll.is_hidden:
                poll.is_hidden = True
                update_fields.append('is_hidden')
        elif action == 'unhide':
            if poll.is_hidden:
                poll.is_hidden = False
                update_fields.append('is_hidden')
        elif action == 'freeze':
            if not poll.is_frozen:
                poll.is_frozen = True
                update_fields.append('is_frozen')
        elif action == 'unfreeze':
            if poll.is_frozen:
                poll.is_frozen = False
                update_fields.append('is_frozen')
        elif action == 'mark_reviewed':
            # Moderator acknowledges review; clear flag and reset counter
            if poll.under_review or poll.reports_total > 0:
                poll.under_review = False
                poll.reports_total = 0
                update_fields += ['under_review', 'reports_total']

        if update_fields:
            poll.save(update_fields=update_fields)

        return Response({
            'ok': True,
            'poll_id': poll.id,
            'is_hidden': poll.is_hidden,
            'is_frozen': poll.is_frozen,
            'under_review': poll.under_review,
            'reports_total': poll.reports_total,
        }, status=status.HTTP_200_OK)
