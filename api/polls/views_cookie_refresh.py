# polls/views_cookie_refresh.py
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from .auth_cookies import set_access_cookie, set_refresh_cookie

class CookieRefreshView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE)
        if not raw_refresh:
            return Response({'detail': 'no refresh'}, status=status.HTTP_401_UNAUTHORIZED)

        # 1) Верифицируем токен
        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError:
            return Response({'detail': 'invalid refresh'}, status=status.HTTP_401_UNAUTHORIZED)

        # 2) Достаём пользователя из payload
        try:
            user_id = refresh['user_id']
        except KeyError:
            return Response({'detail': 'invalid refresh payload'}, status=status.HTTP_401_UNAUTHORIZED)

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'user not found'}, status=status.HTTP_401_UNAUTHORIZED)

        # 3) Ротация/blacklist при необходимости
        sj = getattr(settings, 'SIMPLE_JWT', {})
        rotate = bool(sj.get('ROTATE_REFRESH_TOKENS', False))
        blacklist_after = bool(sj.get('BLACKLIST_AFTER_ROTATION', False))

        new_refresh = refresh
        if rotate:
            # Если установлен app token_blacklist и включён BLACKLIST_AFTER_ROTATION – добавим старый в blacklist
            if blacklist_after:
                try:
                    refresh.blacklist()
                except Exception:
                    # token_blacklist может быть не подключён — игнорируем
                    pass
            # Выпускаем новый refresh для пользователя
            new_refresh = RefreshToken.for_user(user)

        # 4) Отдаём новые куки (access и refresh)
        resp = Response({'ok': True})
        set_access_cookie(resp, str(new_refresh.access_token))
        set_refresh_cookie(resp, str(new_refresh))
        return resp
