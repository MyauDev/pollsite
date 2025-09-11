from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model, login, authenticate
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers

from django.conf import settings
from django.shortcuts import redirect

# CSRF off for these endpoints (magic-link usually called cross-origin)
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .models_magic import MagicLinkToken
from .models import Vote
from .utils import sha256_hex
from django.db import transaction
from .auth_cookies import set_access_cookie, set_refresh_cookie  # ← cookie helpers

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


@method_decorator(csrf_exempt, name="dispatch")
class RequestMagicLinkView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []  # no SessionAuth → no CSRF

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'email': 'required'}, status=400)

        mlt = MagicLinkToken.generate(email)

        origin = getattr(settings, "FRONTEND_ORIGIN", "http://localhost")
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
        origin = getattr(settings, "FRONTEND_ORIGIN", "http://localhost")
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

        # ensure user
        user, _ = User.objects.get_or_create(
            username=mlt.email.split('@')[0],
            defaults={'email': mlt.email}
        )
        if not user.email:
            user.email = mlt.email
            user.save(update_fields=['email'])

        # optional: merge device votes → read device id from header/cookie if есть
        device_id = request.headers.get('X-Device-Id') or request.COOKIES.get('did')
        try:
            migrate_device_votes_to_user(user, device_id)
        except Exception:
            pass

        # issue JWT in httpOnly cookies
        refresh = RefreshToken.for_user(user)
        resp = Response({'user': {'id': user.id, 'email': user.email}})
        set_access_cookie(resp, str(refresh.access_token))
        set_refresh_cookie(resp, str(refresh))
        return resp


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return Response({'id': u.id, 'email': getattr(u, 'email', None)})
