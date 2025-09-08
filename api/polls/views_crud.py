from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import Poll
from .serializers_write import PollWriteSerializer
from .permissions import IsAuthorOrReadOnly

@method_decorator(csrf_exempt, name="dispatch")
class PollCreateView(generics.CreateAPIView):
    serializer_class = PollWriteSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]  # Use only JWT auth, not session auth

class PollUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = PollWriteSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    queryset = Poll.objects.all()

class PollDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    queryset = Poll.objects.all()