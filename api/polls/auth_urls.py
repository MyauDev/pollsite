from django.urls import path
from .views_auth import RequestMagicLinkView, VerifyMagicLinkView, MeView, RegisterView, LoginView

urlpatterns = [
    # Magic link authentication
    path('magic/request', RequestMagicLinkView.as_view(), name='auth-magic-request'),
    path('magic/verify', VerifyMagicLinkView.as_view(), name='auth-magic-verify'),
    
    # Email/password authentication
    path('register', RegisterView.as_view(), name='auth-register'),
    path('login', LoginView.as_view(), name='auth-login'),
    
    # User info
    path('me', MeView.as_view(), name='auth-me'),
]