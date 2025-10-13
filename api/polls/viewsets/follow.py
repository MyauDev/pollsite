from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from polls.models import FollowAuthor


class FollowAuthorViewSet(GenericViewSet):
    """
    Follow/unfollow authors:
      - POST   /follow/author/{author_id}/
      - DELETE /follow/author/{author_id}/
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path=r"author/(?P<author_id>[^/.]+)")
    def follow_author(self, request, author_id=None):
        fa, _ = FollowAuthor.objects.get_or_create(user=request.user, author_id=author_id)
        return Response({"ok": True, "id": fa.id})

    @action(detail=False, methods=["delete"], url_path=r"author/(?P<author_id>[^/.]+)")
    def unfollow_author(self, request, author_id=None):
        FollowAuthor.objects.filter(user=request.user, author_id=author_id).delete()
        return Response({"ok": True})
