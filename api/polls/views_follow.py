from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Topic, Poll
from .models_follow import FollowTopic, FollowAuthor
from .serializers_follow import TopicSerializer, FollowTopicSerializer, FollowAuthorSerializer


class TopicListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TopicSerializer
    queryset = Topic.objects.all().order_by('name')

class TopicListCreateView(generics.ListCreateAPIView):
    serializer_class = TopicSerializer
    queryset = Topic.objects.all().order_by('name')
    
    def get_permissions(self):
        """
        GET requests allow any user, POST requests require authentication
        """
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        serializer.save()
    
class TopicCreateView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TopicSerializer

    def perform_create(self, serializer):
        serializer.save()



class FollowTopicView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, topic_id: int):
        topic = get_object_or_404(Topic, pk=topic_id)
        ft, _ = FollowTopic.objects.get_or_create(user=request.user, topic=topic)
        return Response({'ok': True, 'id': ft.id})
    def delete(self, request, topic_id: int):
        FollowTopic.objects.filter(user=request.user, topic_id=topic_id).delete()
        return Response({'ok': True})


class FollowAuthorView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def post(self, request, author_id: int):
        fa, _ = FollowAuthor.objects.get_or_create(user=request.user, author_id=author_id)
        return Response({'ok': True, 'id': fa.id})
    def delete(self, request, author_id: int):
        FollowAuthor.objects.filter(user=request.user, author_id=author_id).delete()
        return Response({'ok': True})