from django.db.models import Count
from rest_framework import permissions, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models_comments import Comment
from .models import Poll
from .serializers_comments import CommentReadSerializer, CommentWriteSerializer
from .pagination_comments import CommentsPagination
from .utils import get_client_ip, sha256_hex
from .permissions import IsAuthorOrReadOnly, IsModerator

# rate limits
from django.core.cache import cache
RATE_MIN_PER_IP = 30
RATE_MIN_PER_DEV = 30

class PollCommentsListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CommentReadSerializer
    pagination_class = CommentsPagination

    def get_queryset(self):
        poll_id = self.kwargs['poll_id']
        qs = Comment.objects.filter(poll_id=poll_id, status='visible').annotate(replies_count=Count('replies'))
        parent_id = self.request.query_params.get('parent')
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        else:
            qs = qs.filter(parent__isnull=True)
        return qs.order_by('-id')

class CommentCreateView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = CommentWriteSerializer

    def perform_create(self, serializer):
        data = self.request.data
        ip_hash = sha256_hex(get_client_ip(self.request))
        device_id = self.request.headers.get('X-Device-Id') or self.request.COOKIES.get('did') or ''
        device_hash = sha256_hex(device_id)
        # rate limit
        def hit(key, limit):
            import time
            bucket = int(time.time() // 60)
            ck = f"cmrl:{key}:{bucket}"
            cur = cache.get(ck)
            if cur is None:
                cache.add(ck, 1, timeout=60)
                return True
            else:
                try:
                    return cache.incr(ck) <= limit
                except Exception:
                    return False
        if not hit(f"ip:{ip_hash}", RATE_MIN_PER_IP) or (device_hash and not hit(f"dev:{device_hash}", RATE_MIN_PER_DEV)):
            raise Exception('rate limited')
        force_hidden = False
        try:
            force_hidden = bool(serializer.context.get('force_hidden'))
        except Exception:
            force_hidden = False
        obj = serializer.save(
            author=self.request.user if self.request.user and self.request.user.is_authenticated else None,
            ip_hash=ip_hash or None,
            device_hash=device_hash or None,
            status='hidden' if force_hidden else 'visible',
        )
        self.object = obj

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            self.perform_create(ser)
        except Exception:
            return Response({'detail':'Too Many Requests'}, status=429)
        read = CommentReadSerializer(self.object)
        return Response(read.data, status=status.HTTP_201_CREATED)

class CommentHideView(APIView):
    permission_classes = [IsModerator]
    def post(self, request, pk: int):
        try:
            c = Comment.objects.get(pk=pk)
        except Comment.DoesNotExist:
            return Response({'detail':'not found'}, status=404)
        action = (request.data.get('action') or '').lower()
        if action == 'hide': c.status = 'hidden'
        elif action == 'unhide': c.status = 'visible'
        else: return Response({'detail':'invalid action'}, status=400)
        c.save(update_fields=['status'])
        return Response({'ok': True, 'status': c.status})
