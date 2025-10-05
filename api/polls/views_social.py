from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response

from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client

from rest_framework_simplejwt.tokens import RefreshToken
from .auth_cookies import set_access_cookie, set_refresh_cookie
from .views_auth import migrate_device_votes_to_user  # у тебя уже есть

@method_decorator(csrf_exempt, name="dispatch")
class CookieSocialLoginView(SocialLoginView):
    """
    Accepts OAuth `code`, performs allauth login/registration,
    then issues JWT and sets them as HttpOnly cookies (same flow as password/magic-link).
    """
    client_class = OAuth2Client
    callback_url = None  # override in subclasses

    def post(self, request, *args, **kwargs):
        # Let dj-rest-auth/allauth perform the OAuth exchange.
        dr = super().post(request, *args, **kwargs)

        user = request.user or getattr(self, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return dr  # fallback if login failed

        # Optional: migrate device votes to user
        device_id = request.headers.get('X-Device-Id') or request.COOKIES.get('did')
        try:
            migrate_device_votes_to_user(user, device_id)
        except Exception:
            pass

        # Issue fresh JWT and set cookies
        refresh = RefreshToken.for_user(user)
        resp = Response({'user': {'id': user.id, 'email': getattr(user, 'email', None)}})
        set_access_cookie(resp, str(refresh.access_token))
        set_refresh_cookie(resp, str(refresh))
        return resp


class GoogleCookieLogin(CookieSocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = "http://localhost:3000/auth/google/callback"  # sync with frontend