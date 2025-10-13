from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from polls.models import Topic, FollowTopic
from polls.serializers import TopicSerializer, FollowTopicSerializer


class TopicViewSet(ModelViewSet):
    """
    Topics:
      - GET  /topics/           — list (public)
      - POST /topics/           — create (auth)
      - POST /topics/{id}/follow/   — follow topic (auth)
      - DELETE /topics/{id}/follow/ — unfollow topic (auth)
    """
    queryset = Topic.objects.all().order_by("name")
    serializer_class = TopicSerializer

    def get_permissions(self):
        if self.action in ("create", "follow", "unfollow"):
            return [IsAuthenticated()]
        return [AllowAny()]

    @action(detail=True, methods=["post"], url_path="follow")
    def follow(self, request, pk=None):
        topic = self.get_object()
        ft, _ = FollowTopic.objects.get_or_create(user=request.user, topic=topic)
        data = FollowTopicSerializer(ft, context={"request": request}).data
        return Response({"ok": True, "id": ft.id, "follow": data})

    @action(detail=True, methods=["delete"], url_path="follow")
    def unfollow(self, request, pk=None):
        topic = self.get_object()
        FollowTopic.objects.filter(user=request.user, topic=topic).delete()
        return Response({"ok": True})
