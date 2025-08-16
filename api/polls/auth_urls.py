from django.urls import path
from .views_auth import RequestMagicLinkView, VerifyMagicLinkView, MeView

urlpatterns = [
    path('magic/request', RequestMagicLinkView.as_view(), name='auth-magic-request'),
    path('magic/verify', VerifyMagicLinkView.as_view(), name='auth-magic-verify'),
    path('me', MeView.as_view(), name='auth-me'),
]