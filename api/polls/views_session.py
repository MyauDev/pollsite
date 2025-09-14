from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status


class SessionView(APIView):
    permission_classes = [permissions.AllowAny]
    # authentication_classes = []

    def get(self, request):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return Response({"authenticated": False}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({
            "authenticated": True,
            "user": {
                "id": user.id,
                "email": getattr(user, "email", None),
                "is_staff": bool(getattr(user, "is_staff", False)),
            }
        })
