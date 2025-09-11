from rest_framework import generics, permissions
from rest_framework.permissions import IsAuthenticated
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .models import Poll
from .serializers_write import PollWriteSerializer
from .permissions import IsAuthorOrReadOnly
class PollCreateView(generics.CreateAPIView):
    serializer_class = PollWriteSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

class PollUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = PollWriteSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    queryset = Poll.objects.all().select_related('author')
    lookup_field = 'id'

class PollDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    queryset = Poll.objects.all().select_related('author')
    lookup_field = 'id'
