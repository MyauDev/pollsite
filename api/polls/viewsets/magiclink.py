from __future__ import annotations
import re
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from django.shortcuts import redirect

from rest_framework.viewsets import GenericViewSet
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status as http

from rest_framework_simplejwt.tokens import RefreshToken

from polls.models import MagicLinkToken, Vote
from lib.utils.network import sha256_hex
from lib.auth.cookies import set_access_cookie, set_refresh_cookie

User = get_user_model()

# --- username generator --------------------------------------------------------
USERNAME_RE = re.compile(r"[^a-zA-Z0-9_.-]")

def _clean_username_seed(seed: str) -> str:
    seed = (seed or "").strip()
    if not seed:
        return "user"
    seed = USERNAME_RE.sub("-", seed)
    seed = seed[:32].strip("-.")
    if len(seed) < 3:
        seed = (seed + "-usr")[:3]
    return seed

def make_unique_username(seed: str) -> str:
    """
    Turn seed into a valid unique username (3..32, [a-zA-Z0-9_.-]).
    On collision appends -2, -3, ... until free.
    """
    base = _clean_username_seed(seed or "user")
    if not base:
        base = "user"
    cand = base
    i = 2
    while User.objects.filter(username__iexact=cand).exists():
        suffix = f"-{i}"
        cand = (base[: max(1, 32 - len(suffix))] + suffix).strip("-.")
        i += 1
        if i > 9999:
            cand = f"user-{timezone.now().strftime('%H%M%S')}"
            if not User.objects.filter(username__iexact=cand).exists():
                break
    return cand

def migrate_device_votes_to_user(user, device_id=None) -> int:
    """
    Migrate votes from device-based identification to the user account.
    Call after login if device_id is known (e.g., from header/cookie).
    """
    if not device_id:
        return 0
    device_hash = sha256_hex(device_id)
    try:
        with transaction.atomic():
            device_votes = Vote.objects.filter(device_hash=device_hash, user__isnull=True)
            existing = set(Vote.objects.filter(user=user).values_list("poll_id", flat=True))
            migrated = 0
            for v in device_votes:
                if v.poll_id in existing:
                    continue
                v.user = user
                v.save(update_fields=["user"])
                migrated += 1
            return migrated
    except Exception:
        # Do not fail login on migration errors
        return 0


class MagicLinkViewSet(GenericViewSet):
    """
    Magic-link authentication flow:

      - POST /auth/magic/request      — send code+link to email
      - GET  /auth/magic/verify       — redirect passthrough for FE
      - POST /auth/magic/verify       — verify token+code, issue cookies
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # no SessionAuth → no CSRF checks

    @action(detail=False, methods=["post"], url_path="request")
    def request_link(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"email": "required"}, status=http.HTTP_400_BAD_REQUEST)

        mlt = MagicLinkToken.generate(email)

        origin = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000")
        verify_url = f"{origin}/auth/verify?token={mlt.token}&code={mlt.code}"

        from django.core.mail import send_mail  # local import to avoid hard dep in tests
        send_mail("Your sign-in link", f"Code: {mlt.code}\nLink: {verify_url}", None, [email])

        return Response({"ok": True})

    @action(detail=False, methods=["get"], url_path="verify")
    def verify_redirect(self, request):
        token = request.query_params.get("token", "")
        code = request.query_params.get("code", "")
        origin = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000")
        url = f"{origin}/auth/verify?token={token}&code={code}"
        return redirect(url)

    @action(detail=False, methods=["post"], url_path="verify")
    def verify(self, request):
        token = (request.data.get("token") or "").strip()
        code = (request.data.get("code") or "").strip()
        if not token or not code:
            return Response({"detail": "token and code required"}, status=http.HTTP_400_BAD_REQUEST)

        try:
            mlt = MagicLinkToken.objects.get(token=token)
        except MagicLinkToken.DoesNotExist:
            return Response({"detail": "invalid token"}, status=http.HTTP_400_BAD_REQUEST)

        if not mlt.is_valid() or mlt.code != code:
            return Response({"detail": "invalid or expired"}, status=http.HTTP_400_BAD_REQUEST)

        mlt.used_at = timezone.now()
        mlt.save(update_fields=["used_at"])

        # ensure user by email (NOT by username)
        email = (mlt.email or "").strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            seed = email.split("@")[0] if "@" in email else (email or "user")
            username = make_unique_username(seed)
            user = User.objects.create_user(username=username, email=email or None)
        elif not getattr(user, "username", None):
            user.username = make_unique_username(email.split("@")[0] if "@" in email else email or "user")
            user.save(update_fields=["username"])

        # optional: merge device votes
        device_id = request.headers.get("X-Device-Id") or request.COOKIES.get("did")
        try:
            migrate_device_votes_to_user(user, device_id)
        except Exception:
            pass

        # issue JWT in httpOnly cookies
        refresh = RefreshToken.for_user(user)
        resp = Response({"user": {"id": user.id, "email": user.email, "username": user.username}})
        set_access_cookie(resp, str(refresh.access_token))
        set_refresh_cookie(resp, str(refresh))
        return resp
