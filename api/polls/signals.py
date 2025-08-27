from collections import Counter
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Vote, PollStats
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Count
from .models import Vote, Poll
from .consumers import publish_poll_update

@receiver(post_save, sender=Vote)
def vote_created(sender, instance: Vote, created: bool, **kwargs):
    if not created:
        return
    poll = instance.poll
    agg = Vote.objects.filter(poll=poll).values('option_id').annotate(c=Count('id'))
    counts = {row['option_id']: row['c'] for row in agg}
    total = sum(counts.values()) or 0
    percents = {opt: round((c/total)*100, 2) if total else 0.0 for opt, c in counts.items()}
    publish_poll_update(poll.id, {
        'poll_id': poll.id,
        'counts': counts,
        'percents': percents,
        'total_votes': total,
    })

def _recalc_stats(poll_id: int):
    # Быстрый пересчёт на старте. В проде лучше инкрементально/через Redis.
    qs = Vote.objects.filter(poll_id=poll_id).values_list('option_id', flat=False)
    counts = Counter([opt_id for _, opt_id in Vote.objects.filter(poll_id=poll_id).values_list('poll_id', 'option_id')])
    total = sum(counts.values())

    stats, _ = PollStats.objects.get_or_create(poll_id=poll_id)
    stats.option_counts = {str(k): v for k, v in counts.items()}
    stats.total_votes = total
    stats.save(update_fields=['option_counts', 'total_votes', 'updated_at'])


@receiver(post_save, sender=Vote)
def on_vote_created(sender, instance: Vote, created, **kwargs):
    if created:
        _recalc_stats(instance.poll_id)


@receiver(post_delete, sender=Vote)
def on_vote_deleted(sender, instance: Vote, **kwargs):
    _recalc_stats(instance.poll_id)