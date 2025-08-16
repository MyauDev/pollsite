from rest_framework.pagination import CursorPagination

class FeedCursorPagination(CursorPagination):
    # Пагинируем по времени создания (свежие вперёд)
    page_size = 10
    ordering = '-created_at'  # базовый порядок; доп.ранжирование сделаем в queryset
    cursor_query_param = 'cursor'