from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Poll
from .serializers_write import PollWriteSerializer
from .permissions import IsAuthorOrReadOnly

class PollCreateView(generics.CreateAPIView):
    serializer_class = PollWriteSerializer
    permission_classes = [IsAuthenticated]

class PollUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = PollWriteSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    queryset = Poll.objects.all()

class PollDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    queryset = Poll.objects.all()