from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

class SessionView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # пусть стандартные классы сработают из DEFAULTS

    def get(self, request):
        # ВНИМАНИЕ: реальная аутентификация придёт из REST_FRAMEWORK DEFAULT_AUTHENTICATION_CLASSES
        user = request.user if getattr(request, 'user', None) and request.user.is_authenticated else None
        if not user:
            return Response({'authenticated': False}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({
            'authenticated': True,
            'user': {
                'id': user.id,
                'email': getattr(user, 'email', None),
                'is_staff': bool(getattr(user, 'is_staff', False)),
            }
        })
