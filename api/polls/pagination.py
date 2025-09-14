from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.exceptions import NotFound

class FeedCursorPagination(CursorPagination):
    # Пагинируем по времени создания (свежие вперёд)
    page_size = 10
    ordering = '-created_at'  # базовый порядок; доп.ранжирование сделаем в queryset
    cursor_query_param = 'cursor'

    def paginate_queryset(self, queryset, request, view=None):
        try:
            return super().paginate_queryset(queryset, request, view)
        except NotFound:
            # Если курсор некорректный или больше данных нет
            self.has_next = False
            self.has_previous = False
            self.next_cursor = None
            self.previous_cursor = None
            self._empty = True
            return []

    def get_paginated_response(self, data):
        if getattr(self, "_empty", False):
            return Response({
                "next": None,
                "previous": None,
                "results": []
            })
        return super().get_paginated_response(data)