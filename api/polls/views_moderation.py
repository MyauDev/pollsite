from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from .models import Poll
from .models_report import Report
from .serializers_moderation import ReportCreateSerializer, ReportListSerializer, ModerationActionSerializer
from .permissions import IsModerator

class ReportCreateView(generics.CreateAPIView):
    serializer_class = ReportCreateSerializer
    permission_classes = [permissions.AllowAny]

class ReportListView(generics.ListAPIView):
    serializer_class = ReportListSerializer
    permission_classes = [IsModerator]

    def get_queryset(self):
        # Очередь свежих жалоб
        return Report.objects.order_by('-created_at')

class ModerationActionView(APIView):
    permission_classes = [IsModerator]

    def post(self, request, poll_id: int):
        ser = ModerationActionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        action = ser.validated_data['action']
        try:
            poll = Poll.objects.get(pk=poll_id)
        except Poll.DoesNotExist:
            return Response({'detail': 'not found'}, status=404)
        if action == 'hide':
            poll.is_hidden = True
        elif action == 'unhide':
            poll.is_hidden = False
        elif action == 'freeze':
            poll.is_frozen = True
        elif action == 'unfreeze':
            poll.is_frozen = False
        poll.save(update_fields=['is_hidden','is_frozen'])
        return Response({'ok': True, 'poll_id': poll.id, 'is_hidden': poll.is_hidden, 'is_frozen': poll.is_frozen})
