from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.core.cache import cache
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers_password import (
    SignupSerializer, LoginSerializer,
    ChangePasswordSerializer, ResetPasswordRequestSerializer, ResetPasswordConfirmSerializer
)
from .auth_cookies import set_access_cookie, set_refresh_cookie, clear_auth_cookies


User = get_user_model()


# --- Simple per-IP rate limiter via cache -------------------------------------
def _rl(key: str, limit: int, sec: int = 60) -> bool:
    import time
    b = int(time.time() // sec)
    k = f"pwd:{key}:{b}"
    val = cache.get(k)
    if val is None:
        cache.add(k, 1, timeout=sec)
        return True
    try:
        return cache.incr(k) <= limit
    except Exception:
        return False


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        if not _rl(f"signup:{request.META.get('REMOTE_ADDR')}", 20):
            return Response({'detail': 'Too Many Requests'}, status=429)

        ser = SignupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()

        # Issue tokens and set cookies (no tokens in body)
        refresh = RefreshToken.for_user(user)
        resp = Response({'user': {'id': user.id, 'email': user.email}})
        set_access_cookie(resp, str(refresh.access_token))
        set_refresh_cookie(resp, str(refresh))
        return resp


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        if not _rl(f"login:{request.META.get('REMOTE_ADDR')}", 60):
            return Response({'detail': 'Too Many Requests'}, status=429)

        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.validated_data['user']

        # Issue tokens and set cookies (no tokens in body)
        refresh = RefreshToken.for_user(user)
        resp = Response({'user': {'id': user.id, 'email': user.email}})
        set_access_cookie(resp, str(refresh.access_token))
        set_refresh_cookie(resp, str(refresh))
        return resp


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Try to read refresh token from cookies first; fallback to request body
        token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE) or request.data.get('refresh')

        resp = Response({'ok': True})
        clear_auth_cookies(resp)

        if token:
            try:
                t = RefreshToken(token)
                t.blacklist()
            except Exception:
                # Ignore invalid/expired refresh here to keep logout idempotent
                pass

        return resp


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        user = request.user
        user.set_password(ser.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'ok': True})


class ResetPasswordRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = ResetPasswordRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data['email'].lower().strip()

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Do not reveal account existence
            return Response({'ok': True})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = request.build_absolute_uri('/api/auth/password/reset/confirm')
        msg = f"Reset your password:\n{link}\nuid={uid}\ntoken={token}"
        send_mail('Reset password', msg, None, [email])

        return Response({'ok': True})


class ResetPasswordConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        ser = ResetPasswordConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        uid = ser.validated_data['uid']
        token = ser.validated_data['token']
        new_password = ser.validated_data['new_password']

        try:
            uid_int = int(urlsafe_base64_decode(uid).decode('utf-8'))
            user = User.objects.get(pk=uid_int)
        except Exception:
            return Response({'detail': 'invalid uid'}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'invalid token'}, status=400)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'ok': True})

