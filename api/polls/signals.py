from collections import Counter
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.db.models import Count

from polls.models import Vote, Poll, PollStats, UserProfile
from lib.redis.pubsub import publish_poll_update

User = get_user_model()


@receiver(post_save, sender=User)
def create_profile_and_nick(sender, instance, created, **kwargs):
    """Automatically create a UserProfile when a user is registered."""
    if created:
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if not profile.public_nickname:
            profile.save()


@receiver(post_save, sender=Vote)
def vote_created(sender, instance: Vote, created: bool, **kwargs):
    """Publish live poll update (SSE) whenever a new vote is created."""
    if not created:
        return
    poll = instance.poll
    agg = Vote.objects.filter(poll=poll).values('option_id').annotate(c=Count('id'))
    counts = {row['option_id']: row['c'] for row in agg}
    total = sum(counts.values()) or 0
    percents = {opt: round((c / total) * 100, 2) if total else 0.0 for opt, c in counts.items()}

    publish_poll_update(poll.id, {
        "poll_id": poll.id,
        "counts": counts,
        "percents": percents,
        "total_votes": total,
    })


def _recalc_stats(poll_id: int):
    """Recalculate PollStats table after votes are created or deleted."""
    counts = Counter(Vote.objects.filter(poll_id=poll_id).values_list("option_id", flat=True))
    total = sum(counts.values())
    stats, _ = PollStats.objects.get_or_create(poll_id=poll_id)
    stats.option_counts = {str(k): v for k, v in counts.items()}
    stats.total_votes = total
    stats.save(update_fields=["option_counts", "total_votes", "updated_at"])


@receiver(post_save, sender=Vote)
def on_vote_created(sender, instance: Vote, created, **kwargs):
    if created:
        _recalc_stats(instance.poll_id)


@receiver(post_delete, sender=Vote)
def on_vote_deleted(sender, instance: Vote, **kwargs):
    _recalc_stats(instance.poll_id)
