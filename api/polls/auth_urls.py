from django.urls import path
from .views_social import GoogleCookieLogin

from .views_auth import RequestMagicLinkView, VerifyMagicLinkView, MeView
from .views_password import (
    SignupView,
    LoginView,
    LogoutView,
    ChangePasswordView,
    ResetPasswordRequestView,
    ResetPasswordConfirmView,
)
from .views_cookie_refresh import CookieRefreshView
from .views_session import SessionView
from .views_availability import CheckUsernameView, CheckEmailView

urlpatterns = [
    # magic-link
    path('magic/request', RequestMagicLinkView.as_view(), name='auth-magic-request'),
    path('magic/verify', VerifyMagicLinkView.as_view(), name='auth-magic-verify'),

    # User info
    path('me', MeView.as_view(), name='auth-me'),

    # парольная регистрация/логин
    path('signup', SignupView.as_view(), name='auth-signup'),
    path('login', LoginView.as_view(), name='auth-login'),
    path('logout', LogoutView.as_view(), name='auth-logout'),
    path('password/change', ChangePasswordView.as_view(), name='auth-password-change'),
    path('password/reset/request', ResetPasswordRequestView.as_view(), name='auth-password-reset-request'),
    path('password/reset/confirm', ResetPasswordConfirmView.as_view(), name='auth-password-reset-confirm'),

    # refresh токена через куки
    path('refresh', CookieRefreshView.as_view(), name='auth-cookie-refresh'),

    path('session', SessionView.as_view(), name='auth-session'),
    path('social/google', GoogleCookieLogin.as_view(), name='auth-social-google'),
    path('check-username', CheckUsernameView.as_view(), name='auth-check-username'),
    path('check-email', CheckEmailView.as_view(), name='auth-check-email'),
]
