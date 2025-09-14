# polls/renderers.py
from rest_framework.renderers import BaseRenderer
from rest_framework.negotiation import BaseContentNegotiation

class EventStreamRenderer(BaseRenderer):
    """
    DRF renderer for Server-Sent Events (SSE).
    We return StreamingHttpResponse directly, so render() is effectively unused.
    """
    media_type = "text/event-stream"
    format = "event-stream"
    charset = None

    def render(self, data, accepted_media_type=None, renderer_context=None):
        # DRF won't reach here because we return a StreamingHttpResponse in the view.
        return data


class IgnoreClientNegotiation(BaseContentNegotiation):
    """
    Always pick the first renderer from view.renderer_classes.
    This avoids 406 when client sends odd Accept header.
    """
    def select_renderer(self, request, renderers, format_suffix=None):
        return renderers[0], renderers[0].media_type
