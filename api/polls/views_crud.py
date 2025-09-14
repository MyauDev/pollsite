from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Poll
from .serializers_write import PollWriteSerializer
from .permissions import IsAuthorOrReadOnly


class PollCreateView(generics.CreateAPIView):
    serializer_class = PollWriteSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        poll = ser.save()
        return Response({'id': poll.id}, status=status.HTTP_201_CREATED)


class PollUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = PollWriteSerializer
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    queryset = Poll.objects.all().select_related('author')
    lookup_field = 'pk'  # чтобы совпадало с <int:pk> в urls


class PollDeleteView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated, IsAuthorOrReadOnly]
    queryset = Poll.objects.all().select_related('author')
    lookup_field = 'pk'
