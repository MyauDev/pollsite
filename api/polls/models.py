from __future__ import annotations
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q
from django.utils import timezone
import secrets

User = settings.AUTH_USER_MODEL


class ResultsMode(models.TextChoices):
    OPEN = 'open', 'Open (видно всем)'
    HIDDEN_UNTIL_VOTE = 'hidden_until_vote', 'Скрыть до голоса'
    HIDDEN_UNTIL_CLOSE = 'hidden_until_close', 'Скрыть до завершения'


class VisibilityMode(models.TextChoices):
    PUBLIC = 'public', 'Публичный'
    LINK = 'link', 'По ссылке'


class Poll(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='polls')
    title = models.CharField(max_length=240)
    description = models.TextField(blank=True)

    # настройки
    type_multi = models.BooleanField(default=False, help_text='Разрешить множественный выбор')
    results_mode = models.CharField(max_length=32, choices=ResultsMode.choices, default=ResultsMode.OPEN)
    visibility = models.CharField(max_length=16, choices=VisibilityMode.choices, default=VisibilityMode.PUBLIC)

    media_url = models.URLField(blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)

    # служебные
    is_frozen = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['-created_at'], name='poll_created_idx'),
            models.Index(fields=['visibility', '-created_at'], name='poll_vis_created_idx'),
        ]

    def __str__(self):
        return f"Poll({self.id}): {self.title[:40]}"

    @property
    def is_active(self) -> bool:
        if self.is_hidden or self.is_frozen:
            return False
        if self.closes_at and timezone.now() >= self.closes_at:
            return False
        return True


class PollOption(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=140)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = [('poll', 'order')]
        ordering = ['order', 'id']

    def __str__(self):
        return f"Option({self.id}) of Poll({self.poll_id}): {self.text[:40]}"


class Topic(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class PollTopic(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE)

    class Meta:
        unique_together = [('poll', 'topic')]
        indexes = [
            models.Index(fields=['topic', 'poll'], name='polltopic_topic_poll_idx'),
        ]


class Vote(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name='votes')
    option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name='votes')

    # кто голосовал
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='votes')
    ip_hash = models.CharField(max_length=64, blank=True, null=True)
    device_hash = models.CharField(max_length=64, blank=True, null=True)

    # идемпотентность/аудит
    idempotency_key = models.CharField(max_length=64, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['poll', 'created_at'], name='vote_poll_created_idx'),
            models.Index(fields=['option'], name='vote_option_idx'),
            models.Index(fields=['user'], name='vote_user_idx'),
        ]
        constraints = [
            # Один голос на опрос для авторизованного пользователя
            models.UniqueConstraint(
                fields=['poll', 'user'],
                name='uniq_vote_poll_user',
                condition=Q(user__isnull=False)
            ),
            # Один голос на опрос для одного device_hash (если есть)
            models.UniqueConstraint(
                fields=['poll', 'device_hash'],
                name='uniq_vote_poll_device',
                condition=Q(device_hash__isnull=False)
            ),
            # Один голос на опрос для одного ip_hash (если есть)
            models.UniqueConstraint(
                fields=['poll', 'ip_hash'],
                name='uniq_vote_poll_ip',
                condition=Q(ip_hash__isnull=False)
            ),
        ]

    def __str__(self):
        ident = self.user_id or self.device_hash or self.ip_hash or 'anon'
        return f"Vote(P{self.poll_id}/O{self.option_id}) by {ident}"


class PollStats(models.Model):
    poll = models.OneToOneField(Poll, on_delete=models.CASCADE, related_name='stats')
    views = models.PositiveIntegerField(default=0)
    unique_viewers = models.PositiveIntegerField(default=0)
    total_votes = models.PositiveIntegerField(default=0)
    # counts по опциям: {option_id: count}
    option_counts = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['-updated_at'], name='pollstats_updated_idx'),
        ]

    def __str__(self):
        return f"PollStats({self.poll_id}) votes={self.total_votes}"
