from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework import status
from polls.serializers import ProfileSerializer


class CurrentProfileView(APIView):
    """
    GET or PATCH current user's profile
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def get(self, request):
        """Get current user's profile"""
        serializer = ProfileSerializer(request.user.profile, context={'request': request})
        return Response(serializer.data)
    
    def patch(self, request):
        """Update current user's profile"""
        profile = request.user.profile
        serializer = ProfileSerializer(
            instance=profile,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
