from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework_simplejwt.tokens import RefreshToken, AccessToken, TokenError
from .auth_cookies import set_access_cookie, set_refresh_cookie

class CookieRefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE)
        if not raw_refresh:
            return Response({'detail': 'no refresh'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError:
            return Response({'detail': 'invalid refresh'}, status=status.HTTP_401_UNAUTHORIZED)
        # rotation (в SIMPLE_JWT включена)
        new_refresh = RefreshToken.for_user(refresh.user)
        resp = Response({'ok': True})
        set_access_cookie(resp, str(new_refresh.access_token))
        set_refresh_cookie(resp, str(new_refresh))
        return resp
