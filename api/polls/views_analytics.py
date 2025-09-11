from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from django.contrib.auth import get_user_model
from .serializers_analytics import EventInSerializer
from .models import Poll
from .models_analytics import Event


User = get_user_model()


class CollectEventView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    def post(self, request):
        ser = EventInSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data
        try:
            poll = Poll.objects.only('id').get(pk=d['poll_id'])
        except Poll.DoesNotExist:
            return Response({'detail': 'poll not found'}, status=404)
        Event.objects.create(
            kind=d['kind'], poll=poll,
            author=request.user if request.user.is_authenticated else None,
            device_id=d.get('device_id',''), dwell_ms=d.get('dwell_ms',0),
        )
        return Response({'ok': True})
