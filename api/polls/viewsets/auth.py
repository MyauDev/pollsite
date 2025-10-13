from __future__ import annotations
import time
import re

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from rest_framework import permissions, status as http
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.permissions import IsAuthenticated

from rest_framework_simplejwt.tokens import RefreshToken, TokenError

from polls.serializers import (
    SignupSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    ResetPasswordRequestSerializer,
    ResetPasswordConfirmSerializer,
)
from lib.auth.cookies import set_access_cookie, set_refresh_cookie, clear_auth_cookies

User = get_user_model()

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.-]{3,32}$")


def _rl(key: str, limit: int, sec: int = 60) -> bool:
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


class AuthViewSet(GenericViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    @action(detail=False, methods=["get"], url_path="session")
    def session(self, request):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return Response({"authenticated": False}, status=http.HTTP_401_UNAUTHORIZED)
        return Response({"authenticated": True, "user": {"id": user.id, "email": getattr(user, "email", None), "is_staff": bool(getattr(user, "is_staff", False))}})

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated], url_path="me")
    def me(self, request):
        u = request.user
        return Response({"id": u.id, "email": getattr(u, "email", None), "username": getattr(u, "username", None)})

    @action(detail=False, methods=["post"], url_path="signup")
    def signup(self, request):
        if not _rl(f"signup:{request.META.get('REMOTE_ADDR')}", 20):
            return Response({"detail": "Too Many Requests"}, status=http.HTTP_429_TOO_MANY_REQUESTS)
        ser = SignupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        refresh = RefreshToken.for_user(user)
        resp = Response({"user": {"id": user.id, "email": user.email, "username": user.username}})
        set_access_cookie(resp, str(refresh.access_token))
        set_refresh_cookie(resp, str(refresh))
        return resp

    @action(detail=False, methods=["post"], url_path="login")
    def login(self, request):
        if not _rl(f"login:{request.META.get('REMOTE_ADDR')}", 60):
            return Response({"detail": "Too Many Requests"}, status=http.HTTP_429_TOO_MANY_REQUESTS)
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        resp = Response({"user": {"id": user.id, "email": user.email, "username": user.username}})
        set_access_cookie(resp, str(refresh.access_token))
        set_refresh_cookie(resp, str(refresh))
        return resp

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="logout")
    def logout(self, request):
        token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE) or request.data.get("refresh")
        resp = Response({"ok": True})
        clear_auth_cookies(resp)
        if token:
            try:
                t = RefreshToken(token)
                t.blacklist()
            except Exception:
                pass
        return resp

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="change-password")
    def change_password(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        user = request.user
        user.set_password(ser.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"ok": True})

    @action(detail=False, methods=["post"], url_path="password/reset/request")
    def reset_request(self, request):
        ser = ResetPasswordRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        email = ser.validated_data["email"].lower().strip()
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({"ok": True})
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = request.build_absolute_uri("/api/auth/password/reset/confirm")
        msg = f"Reset your password:\n{link}\nuid={uid}\ntoken={token}"
        send_mail("Reset password", msg, None, [email])
        return Response({"ok": True})

    @action(detail=False, methods=["post"], url_path="password/reset/confirm")
    def reset_confirm(self, request):
        ser = ResetPasswordConfirmSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        uid = ser.validated_data["uid"]
        token = ser.validated_data["token"]
        new_password = ser.validated_data["new_password"]
        try:
            uid_int = int(urlsafe_base64_decode(uid).decode("utf-8"))
            user = User.objects.get(pk=uid_int)
        except Exception:
            return Response({"detail": "invalid uid"}, status=http.HTTP_400_BAD_REQUEST)
        if not default_token_generator.check_token(user, token):
            return Response({"detail": "invalid token"}, status=http.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"ok": True})

    # ---- availability checks ----

    @action(detail=False, methods=["get"], url_path="check-username")
    def check_username(self, request):
        if not _rl(f"uname:{request.META.get('REMOTE_ADDR')}", limit=30, sec=10):
            return Response({"ok": False, "detail": "Too Many Requests"}, status=http.HTTP_429_TOO_MANY_REQUESTS)
        u = (request.query_params.get("u", "") or "").strip()
        if not u:
            return Response({"ok": True, "available": False, "normalized": u, "reason": "empty"})
        if not USERNAME_RE.match(u):
            return Response({"ok": True, "available": False, "normalized": u, "reason": "invalid_format", "hint": "Use 3–32 chars: letters, digits, '.', '-', '_'"})
        exists = User.objects.filter(username__iexact=u).exists()
        return Response({"ok": True, "available": not exists, "normalized": u})

    @action(detail=False, methods=["get"], url_path="check-email")
    def check_email(self, request):
        if not _rl(f"email:{request.META.get('REMOTE_ADDR')}", limit=30, sec=10):
            return Response({"ok": False, "detail": "Too Many Requests"}, status=http.HTTP_429_TOO_MANY_REQUESTS)
        e = (request.query_params.get("e", "") or "").strip().lower()
        if not e:
            return Response({"ok": True, "available": False, "normalized": e, "reason": "empty"})
        try:
            validate_email(e)
        except ValidationError:
            return Response({"ok": True, "available": False, "normalized": e, "reason": "invalid_email"})
        exists = User.objects.filter(email__iexact=e).exists()
        return Response({"ok": True, "available": not exists, "normalized": e})

    # ---- cookie refresh ----

    @action(detail=False, methods=["post"], url_path="token/refresh")
    def cookie_refresh(self, request):
        raw_refresh = request.COOKIES.get(settings.JWT_REFRESH_COOKIE)
        if not raw_refresh:
            return Response({"detail": "no refresh"}, status=http.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError:
            return Response({"detail": "invalid refresh"}, status=http.HTTP_401_UNAUTHORIZED)
        try:
            user_id = refresh["user_id"]
        except KeyError:
            return Response({"detail": "invalid refresh payload"}, status=http.HTTP_401_UNAUTHORIZED)
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "user not found"}, status=http.HTTP_401_UNAUTHORIZED)

        sj = getattr(settings, "SIMPLE_JWT", {})
        rotate = bool(sj.get("ROTATE_REFRESH_TOKENS", False))
        blacklist_after = bool(sj.get("BLACKLIST_AFTER_ROTATION", False))

        new_refresh = refresh
        if rotate:
            if blacklist_after:
                try:
                    refresh.blacklist()
                except Exception:
                    pass
            new_refresh = RefreshToken.for_user(user)

        resp = Response({"ok": True})
        set_access_cookie(resp, str(new_refresh.access_token))
        set_refresh_cookie(resp, str(new_refresh))
        return resp
