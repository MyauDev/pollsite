from django.db import transaction
from rest_framework import throttling, permissions, status as http
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ReadOnlyModelViewSet

from polls.models import Poll, Report
from polls.permissions import IsModerator
from polls.serializers import (
    ReportCreateSerializer,
    ReportListSerializer,
    ModerationActionSerializer,
    PollModerationQueueSerializer,
)


class ReportAnonRateThrottle(throttling.AnonRateThrottle):
    rate = "5/min"


class ReportUserRateThrottle(throttling.UserRateThrottle):
    rate = "10/min"


class ReportViewSet(ReadOnlyModelViewSet):
    """
    Reports list (moderators) and creation.
      - GET  /moderation/reports/   (list, moderators)
      - POST /moderation/reports/   (create, open)
    """
    queryset = Report.objects.order_by("-created_at")
    serializer_class = ReportListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        return [IsModerator()]

    def get_throttles(self):
        if self.action == "create":
            return [ReportAnonRateThrottle(), ReportUserRateThrottle()]
        return super().get_throttles()

    def create(self, request, *args, **kwargs):
        ser = ReportCreateSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        obj = ser.save()
        out = ReportListSerializer(obj).data
        return Response(out, status=http.HTTP_201_CREATED)


class ModerationViewSet(GenericViewSet):
    """
    Moderation queue and actions for polls.
      - GET  /moderation/queue/
      - POST /moderation/polls/{id}/action/
    """
    permission_classes = [IsModerator]

    @action(detail=False, methods=["get"], url_path="queue")
    def queue(self, request):
        qs = Poll.objects.filter(under_review=True).order_by("-reports_total", "-id")
        ser = PollModerationQueueSerializer(qs, many=True)
        return Response(ser.data)

    @action(detail=True, methods=["post"], url_path="polls/(?P<poll_id>[^/.]+)/action")
    @transaction.atomic
    def action(self, request, poll_id: int = None, *args, **kwargs):
        ser = ModerationActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action_name = ser.validated_data["action"]

        try:
            poll = Poll.objects.select_for_update().get(pk=poll_id)
        except Poll.DoesNotExist:
            return Response({"detail": "not found"}, status=http.HTTP_404_NOT_FOUND)

        update_fields = []

        if action_name == "hide":
            if not poll.is_hidden:
                poll.is_hidden = True
                update_fields.append("is_hidden")
        elif action_name == "unhide":
            if poll.is_hidden:
                poll.is_hidden = False
                update_fields.append("is_hidden")
        elif action_name == "freeze":
            if not poll.is_frozen:
                poll.is_frozen = True
                update_fields.append("is_frozen")
        elif action_name == "unfreeze":
            if poll.is_frozen:
                poll.is_frozen = False
                update_fields.append("is_frozen")
        elif action_name == "mark_reviewed":
            if poll.under_review or poll.reports_total > 0:
                poll.under_review = False
                poll.reports_total = 0
                update_fields += ["under_review", "reports_total"]

        if update_fields:
            poll.save(update_fields=update_fields)

        return Response(
            {
                "ok": True,
                "poll_id": poll.id,
                "is_hidden": poll.is_hidden,
                "is_frozen": poll.is_frozen,
                "under_review": poll.under_review,
                "reports_total": poll.reports_total,
            },
            status=http.HTTP_200_OK,
        )
