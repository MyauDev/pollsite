from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from .models import Poll
from .models_analytics import PollAgg


class AuthorDashboardView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        polls = Poll.objects.filter(author=request.user).values('id','title')
        aggs = {a['poll_id']: a for a in PollAgg.objects.filter(poll_id__in=[p['id'] for p in polls]).values('poll_id','views','votes','shares','dwell_ms_avg')}
        items = []
        for p in polls:
            a = aggs.get(p['id'], {'views':0,'votes':0,'shares':0,'dwell_ms_avg':0})
            ctr = (a['votes'] / a['views'] * 100) if a['views'] else 0
            items.append({
                'id': p['id'], 'title': p['title'],
                'views': a['views'], 'votes': a['votes'], 'shares': a['shares'], 'dwell_ms_avg': a['dwell_ms_avg'],
                'ctr': round(ctr, 2),
            })
        return Response({'items': items})
