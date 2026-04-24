from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework import status
from polls.serializers import ProfileSerializer


class CurrentProfileView(APIView):
    """
    GET or PATCH current user's profile (/profile/me/)
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        serializer = ProfileSerializer(request.user.profile, context={'request': request})
        data = serializer.data
        # Expose email from the User model
        data['user'] = {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
        }
        return Response(data)

    def patch(self, request):
        profile = request.user.profile
        serializer = ProfileSerializer(
            instance=profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        data = serializer.data
        data['user'] = {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
        }
        return Response(data)
