from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response
from rest_framework.exceptions import NotFound


class CommentsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        try:
            return super().paginate_queryset(queryset, request, view)
        except NotFound:
            # Gracefully return empty page instead of raising 404 for out-of-range page
            self.page = None
            return []

    def get_paginated_response(self, data):
        if self.page is None:
            return Response({"count": 0, "next": None, "previous": None, "results": []})
        return super().get_paginated_response(data)


class FeedCursorPagination(CursorPagination):
    """
    Cursor-based pagination for the feed. Base ordering by created_at; extra ranking is done in queryset.
    """
    page_size = 10
    ordering = "-created_at"
    cursor_query_param = "cursor"

    def paginate_queryset(self, queryset, request, view=None):
        try:
            return super().paginate_queryset(queryset, request, view)
        except NotFound:
            # Invalid/expired cursor → empty slice
            self.has_next = False
            self.has_previous = False
            self.next_cursor = None
            self.previous_cursor = None
            self._empty = True
            return []

    def get_paginated_response(self, data):
        if getattr(self, "_empty", False):
            return Response({"next": None, "previous": None, "results": []})
        return super().get_paginated_response(data)
