from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL 


class Event(models.Model):
    class Kind(models.TextChoices):
        VIEW = 'view', 'view'
        DWELL = 'dwell', 'dwell'
        VOTE = 'vote', 'vote'
        SHARE = 'share', 'share'


    kind = models.CharField(max_length=16, choices=Kind.choices)
    poll = models.ForeignKey('polls.Poll', on_delete=models.CASCADE)
    author = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)  # кто совершил (если авторизован)
    device_id = models.CharField(max_length=64, blank=True)
    ts = models.DateTimeField(auto_now_add=True)
    # свойства
    dwell_ms = models.PositiveIntegerField(default=0)


    class Meta:
        indexes = [
            models.Index(fields=['poll', 'ts'], name='idx_event_poll_ts'),
            models.Index(fields=['kind', 'ts'], name='idx_event_kind_ts'),
        ]


class PollAgg(models.Model):
    poll = models.OneToOneField('polls.Poll', on_delete=models.CASCADE, related_name='agg')
    # накопительные метрики
    views = models.PositiveIntegerField(default=0)
    votes = models.PositiveIntegerField(default=0)
    shares = models.PositiveIntegerField(default=0)
    dwell_ms_sum = models.BigIntegerField(default=0)
    dwell_ms_avg = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
