from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model, login
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models_magic import MagicLinkToken

User = get_user_model()

class RequestMagicLinkView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email:
            return Response({'email':'required'}, status=400)
        # создаём токен
        mlt = MagicLinkToken.generate(email)
        # dev: выводим ссылку в лог + отправляем письмом в консоль
        verify_url = f"{request.build_absolute_uri('/api/auth/magic/verify')}?token={mlt.token}&code={mlt.code}"
        send_mail('Your sign-in link', f"Code: {mlt.code}\nLink: {verify_url}", None, [email])
        return Response({'ok': True})

class VerifyMagicLinkView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        token = request.data.get('token')
        code = request.data.get('code')
        if not token or not code:
            return Response({'detail': 'token and code required'}, status=400)
        try:
            mlt = MagicLinkToken.objects.get(token=token)
        except MagicLinkToken.DoesNotExist:
            return Response({'detail':'invalid token'}, status=400)
        if not mlt.is_valid() or mlt.code != code:
            return Response({'detail':'invalid or expired'}, status=400)
        mlt.used_at = timezone.now(); mlt.save(update_fields=['used_at'])
        # Получаем/создаём пользователя
        user, _ = User.objects.get_or_create(username=mlt.email.split('@')[0], defaults={'email': mlt.email})
        if not user.email:
            user.email = mlt.email; user.save(update_fields=['email'])
        login(request, user)  # сессионный логин
        # JWT
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {'id': user.id, 'email': user.email}
        })

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        u = request.user
        return Response({'id': u.id, 'email': getattr(u, 'email', None)})