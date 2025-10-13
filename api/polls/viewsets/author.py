from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from polls.models import Poll
from polls.models import PollAgg  # re-exported from models/analytics

class AuthorViewSet(GenericViewSet):
    """
    Author tools:
      - GET /author/dashboard/
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        polls = Poll.objects.filter(author=request.user).values("id", "title")
        ids = [p["id"] for p in polls]
        aggs = {a["poll_id"]: a for a in PollAgg.objects.filter(poll_id__in=ids).values("poll_id", "views", "votes", "shares", "dwell_ms_avg")}
        items = []
        for p in polls:
            a = aggs.get(p["id"], {"views": 0, "votes": 0, "shares": 0, "dwell_ms_avg": 0})
            ctr = (a["votes"] / a["views"] * 100) if a["views"] else 0
            items.append({
                "id": p["id"], "title": p["title"],
                "views": a["views"], "votes": a["votes"], "shares": a["shares"], "dwell_ms_avg": a["dwell_ms_avg"],
                "ctr": round(ctr, 2),
            })
        return Response({"items": items})
