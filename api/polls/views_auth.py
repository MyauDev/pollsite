from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.core.cache import cache
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from django.shortcuts import redirect
from django.utils import timezone
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .models_magic import MagicLinkToken
from .models import Vote
from .utils import sha256_hex
from .auth_cookies import set_access_cookie, set_refresh_cookie  # ← cookie helpers

import re

User = get_user_model()


def migrate_device_votes_to_user(user, device_id=None):
    """
    Migrate votes from device-based identification to user account.
    Call this after login if device_id is known (e.g., from header/cookie).
    """
    if not device_id:
        return 0

    device_hash = sha256_hex(device_id)
    try:
        with transaction.atomic():
            device_votes = Vote.objects.filter(device_hash=device_hash, user__isnull=True)

            # skip polls where the user already voted
            existing = set(Vote.objects.filter(user=user).values_list('poll_id', flat=True))
            migrated = 0
            for v in device_votes:
                if v.poll_id in existing:
                    continue
                v.user = user
                v.save(update_fields=['user'])
                migrated += 1
            return migrated
    except Exception as e:
        # do not fail login on migration errors
        print(f"Error migrating device votes: {e}")
        return 0


# --- username generator --------------------------------------------------------
USERNAME_RE = re.compile(r'[^a-zA-Z0-9_.-]')

def _clean_username_seed(seed: str) -> str:
    seed = seed.strip()
    if not seed:
        return "user"
    # оставляем только a-z A-Z 0-9 _ . -
    seed = USERNAME_RE.sub("-", seed)
    # урежем до 32, уберём крайние дефисы/точки
    seed = seed[:32].strip("-.")
    # минимальная длина
    if len(seed) < 3:
        seed = (seed + "-usr")[:3]
    return seed

def make_unique_username(seed: str) -> str:
    """
    Превращает seed в валидный уникальный username (3..32, [a-zA-Z0-9_.-]).
    При коллизиях добавляет -2, -3, ... пока не найдёт свободный.
    """
    base = _clean_username_seed(seed or "user")
    # если вдруг всё вычистили
    if not base:
        base = "user"
    cand = base
    i = 2
    while User.objects.filter(username__iexact=cand).exists():
        suffix = f"-{i}"
        # следим за максимальной длиной 32
        cand = (base[: max(1, 32 - len(suffix))] + suffix).strip("-.")
        i += 1
        if i > 9999:
            # совсем крайний случай
            cand = f"user-{timezone.now().strftime('%H%M%S')}"
            if not User.objects.filter(username__iexact=cand).exists():
                break
    return cand


@method_decorator(csrf_exempt, name="dispatch")
class RequestMagicLinkView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # no SessionAuth → no CSRF

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'email': 'required'}, status=400)

        mlt = MagicLinkToken.generate(email)

        origin = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000")
        verify_url = f"{origin}/auth/verify?token={mlt.token}&code={mlt.code}"

        send_mail(
            'Your sign-in link',
            f"Code: {mlt.code}\nLink: {verify_url}",
            None,
            [email],
        )
        return Response({'ok': True})


@method_decorator(csrf_exempt, name="dispatch")
class VerifyMagicLinkView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # no SessionAuth → no CSRF

    def get(self, request):
        token = request.query_params.get("token", "")
        code = request.query_params.get("code", "")
        origin = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000")
        url = f"{origin}/auth/verify?token={token}&code={code}"
        return redirect(url)

    def post(self, request):
        token = (request.data.get('token') or '').strip()
        code = (request.data.get('code') or '').strip()
        if not token or not code:
            return Response({'detail': 'token and code required'}, status=400)

        try:
            mlt = MagicLinkToken.objects.get(token=token)
        except MagicLinkToken.DoesNotExist:
            return Response({'detail': 'invalid token'}, status=400)

        if not mlt.is_valid() or mlt.code != code:
            return Response({'detail': 'invalid or expired'}, status=400)

        mlt.used_at = timezone.now()
        mlt.save(update_fields=['used_at'])

        # ensure user (ищем по email, НЕ по username)
        email = (mlt.email or "").strip().lower()
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            # создаём пользователя с уникальным username из локальной части email
            seed = email.split("@")[0] if "@" in email else email or "user"
            username = make_unique_username(seed)
            user = User.objects.create_user(username=username, email=email or None)
        else:
            # если у найденного юзера вдруг пустой username — добьём
            if not getattr(user, "username", None):
                user.username = make_unique_username(email.split("@")[0] if "@" in email else email or "user")
                user.save(update_fields=["username"])

        # optional: merge device votes
        device_id = request.headers.get('X-Device-Id') or request.COOKIES.get('did')
        try:
            migrate_device_votes_to_user(user, device_id)
        except Exception:
            pass

        # issue JWT in httpOnly cookies
        refresh = RefreshToken.for_user(user)
        resp = Response({'user': {'id': user.id, 'email': user.email, 'username': user.username}})
        set_access_cookie(resp, str(refresh.access_token))
        set_refresh_cookie(resp, str(refresh))
        return resp


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        # если у тебя есть профиль (public_nickname и т.п.) — можно добавить сюда
        return Response({
            'id': u.id,
            'email': getattr(u, 'email', None),
            'username': getattr(u, 'username', None),
        })
