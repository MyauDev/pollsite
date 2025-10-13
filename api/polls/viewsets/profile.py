from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from polls.serializers import ProfileSerializer

class ProfileViewSet(GenericViewSet):
    """
    Current user's public profile:
      - GET  /profile/me/
      - PATCH /profile/me/
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        return Response(ProfileSerializer(request.user.profile).data)

    @action(detail=False, methods=["patch"], url_path="me")
    def patch_me(self, request):
        profile = request.user.profile
        ser = ProfileSerializer(instance=profile, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)
