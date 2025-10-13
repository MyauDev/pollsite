from celery import shared_task
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from polls.models import Event, PollAgg


@shared_task(name='polls.tasks.aggregate_events')
def aggregate_events():
    from datetime import timedelta
    since = timezone.now() - timedelta(minutes=30)
    qs = Event.objects.filter(ts__gte=since)
    if not qs.exists():
        return 'no events'
    data = {}
    for e in qs.values('poll_id','kind').annotate(c=Count('id'), dwell_sum=Sum('dwell_ms')):
        key = e['poll_id']
        rec = data.setdefault(key, {'view':0,'vote':0,'share':0,'dwell_sum':0})
        rec[e['kind']] = e['c']
        if e['kind'] == 'dwell':
            rec['dwell_sum'] = e['dwell_sum'] or 0
    for poll_id, rec in data.items():
        agg, _ = PollAgg.objects.get_or_create(poll_id=poll_id)
        agg.views += rec.get('view',0)
        agg.votes += rec.get('vote',0)
        agg.shares += rec.get('share',0)
        agg.dwell_ms_sum += rec.get('dwell_sum',0)
        agg.dwell_ms_avg = int((agg.dwell_ms_sum / max(agg.views,1)))
        agg.save()
    Event.objects.filter(ts__lt=since).delete()
    return f'aggregated {len(data)} polls'
