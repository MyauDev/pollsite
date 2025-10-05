from django.contrib.auth import get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.core.cache import cache
import re

User = get_user_model()

# тот же паттерн, что в SignupSerializer
USERNAME_RE = re.compile(r'^[a-zA-Z0-9_.-]{3,32}$')

def _rate_limit(key: str, limit: int, sec: int = 10) -> bool:
    """Очень лёгкий RL: limit запросов за sec по ключу."""
    b = int(timezone.now().timestamp() // sec)
    k = f"avail:{key}:{b}"
    val = cache.get(k)
    if val is None:
        cache.add(k, 1, timeout=sec)
        return True
    try:
        return cache.incr(k) <= limit
    except Exception:
        return False

def _normalize_username(u: str) -> str:
    return (u or "").strip()

def _normalize_email(e: str) -> str:
    return (e or "").strip().lower()


class CheckUsernameView(APIView):
    """
    GET /api/auth/check-username?u=foobar
    -> { ok: true, available: false, normalized: "foobar", reason?: "..." }
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        if not _rate_limit(f"uname:{request.META.get('REMOTE_ADDR')}", limit=30, sec=10):
            return Response({"ok": False, "detail": "Too Many Requests"}, status=429)

        raw = request.query_params.get("u", "")
        u = _normalize_username(raw)

        if not u:
            return Response({"ok": True, "available": False, "normalized": u, "reason": "empty"}, status=200)

        if not USERNAME_RE.match(u):
            return Response({
                "ok": True,
                "available": False,
                "normalized": u,
                "reason": "invalid_format",
                "hint": "Use 3–32 chars: letters, digits, '.', '-', '_'",
            }, status=200)

        exists = User.objects.filter(username__iexact=u).exists()
        return Response({"ok": True, "available": not exists, "normalized": u}, status=200)


class CheckEmailView(APIView):
    """
    GET /api/auth/check-email?e=user@example.com
    -> { ok: true, available: true, normalized: "user@example.com" }
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        if not _rate_limit(f"email:{request.META.get('REMOTE_ADDR')}", limit=30, sec=10):
            return Response({"ok": False, "detail": "Too Many Requests"}, status=429)

        raw = request.query_params.get("e", "")
        e = _normalize_email(raw)

        if not e:
            return Response({"ok": True, "available": False, "normalized": e, "reason": "empty"}, status=200)

        try:
            validate_email(e)
        except ValidationError:
            return Response({"ok": True, "available": False, "normalized": e, "reason": "invalid_email"}, status=200)

        exists = User.objects.filter(email__iexact=e).exists()
        return Response({"ok": True, "available": not exists, "normalized": e}, status=200)
