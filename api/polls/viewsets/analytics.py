from rest_framework.viewsets import GenericViewSet
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status as http

from polls.serializers import EventInSerializer
from polls.models import Poll
from polls.models import Event  # from analytics.py


class AnalyticsViewSet(GenericViewSet):
    """
    Analytics collection:
      - POST /analytics/collect  — record a view/dwell/vote/share event
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    @action(detail=False, methods=["post"], url_path="collect")
    def collect(self, request):
        ser = EventInSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        try:
            poll = Poll.objects.only("id").get(pk=d["poll_id"])
        except Poll.DoesNotExist:
            return Response({"detail": "poll not found"}, status=http.HTTP_404_NOT_FOUND)

        Event.objects.create(
            kind=d["kind"],
            poll=poll,
            author=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
            device_id=d.get("device_id", "") or "",
            dwell_ms=d.get("dwell_ms", 0) or 0,
        )
        return Response({"ok": True})
