from __future__ import annotations

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication

# Helpers to keep max_age in sync with SIMPLE_JWT lifetimes
def _seconds(td) -> int | None:
    try:
        return int(td.total_seconds())
    except Exception:
        return None


def set_access_cookie(response, token: str):
    """
    Set access token into an HttpOnly cookie.
    max_age is taken from SIMPLE_JWT.ACCESS_TOKEN_LIFETIME if available.
    """
    name = getattr(settings, "JWT_ACCESS_COOKIE", "access_token")
    max_age = _seconds(getattr(settings, "SIMPLE_JWT", {}).get("ACCESS_TOKEN_LIFETIME")) or 15 * 60
    response.set_cookie(
        name,
        token,
        httponly=True,
        secure=getattr(settings, "JWT_COOKIE_SECURE", False),
        samesite=getattr(settings, "JWT_COOKIE_SAMESITE", "Lax"),
        path=getattr(settings, "JWT_COOKIE_PATH", "/"),
        max_age=max_age,
    )


def set_refresh_cookie(response, token: str):
    """
    Set refresh token into an HttpOnly cookie.
    max_age is taken from SIMPLE_JWT.REFRESH_TOKEN_LIFETIME if available.
    """
    name = getattr(settings, "JWT_REFRESH_COOKIE", "refresh_token")
    max_age = _seconds(getattr(settings, "SIMPLE_JWT", {}).get("REFRESH_TOKEN_LIFETIME")) or 30 * 24 * 60 * 60
    response.set_cookie(
        name,
        token,
        httponly=True,
        secure=getattr(settings, "JWT_COOKIE_SECURE", False),
        samesite=getattr(settings, "JWT_COOKIE_SAMESITE", "Lax"),
        path=getattr(settings, "JWT_COOKIE_PATH", "/"),
        max_age=max_age,
    )


def clear_auth_cookies(response):
    for name in (
        getattr(settings, "JWT_ACCESS_COOKIE", "access_token"),
        getattr(settings, "JWT_REFRESH_COOKIE", "refresh_token"),
    ):
        response.delete_cookie(
            name,
            path=getattr(settings, "JWT_COOKIE_PATH", "/"),
            samesite=getattr(settings, "JWT_COOKIE_SAMESITE", "Lax"),
        )


class CookieJWTAuthentication(JWTAuthentication):
    """
    Read access JWT from HttpOnly cookie if Authorization header is absent.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)

        raw_token = request.COOKIES.get(getattr(settings, "JWT_ACCESS_COOKIE", "access_token"))
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
