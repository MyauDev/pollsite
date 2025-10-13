from rest_framework.renderers import BaseRenderer
from rest_framework.negotiation import BaseContentNegotiation


class EventStreamRenderer(BaseRenderer):
    """
    DRF renderer for Server-Sent Events (SSE).

    In most cases, StreamingHttpResponse is returned directly,
    so render() will not actually be invoked.
    """
    media_type = "text/event-stream"
    format = "event-stream"
    charset = None

    def render(self, data, accepted_media_type=None, renderer_context=None):
        # DRF won't reach this because the view returns a StreamingHttpResponse.
        return data


class IgnoreClientNegotiation(BaseContentNegotiation):
    """
    Always use the first renderer from the view's renderer_classes.
    Prevents 406 responses when clients send unexpected Accept headers.
    """
    def select_renderer(self, request, renderers, format_suffix=None):
        return renderers[0], renderers[0].media_type
