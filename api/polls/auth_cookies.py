from django.conf import settings

def set_access_cookie(response, token: str):
    response.set_cookie(
        settings.JWT_ACCESS_COOKIE, token, httponly=True, secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE, path=settings.JWT_COOKIE_PATH, max_age=15*60
    )

def set_refresh_cookie(response, token: str):
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE, token, httponly=True, secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE, path=settings.JWT_COOKIE_PATH, max_age=30*24*60*60
    )

def clear_auth_cookies(response):
    for name in (settings.JWT_ACCESS_COOKIE, settings.JWT_REFRESH_COOKIE):
        response.delete_cookie(name, path=settings.JWT_COOKIE_PATH, samesite=settings.JWT_COOKIE_SAMESITE)
