from django.db import models
from django.conf import settings


User = settings.AUTH_USER_MODEL


class Event(models.Model):
    """
    Represents a single user or device event related to a poll.
    Used for lightweight analytics collection (views, votes, shares, dwell time).
    """

    class Kind(models.TextChoices):
        VIEW = "view", "view"
        DWELL = "dwell", "dwell"
        VOTE = "vote", "vote"
        SHARE = "share", "share"

    kind = models.CharField(max_length=16, choices=Kind.choices)
    poll = models.ForeignKey("polls.Poll", on_delete=models.CASCADE)
    author = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="events",
        help_text="Authenticated user who triggered the event (if any).",
    )
    device_id = models.CharField(max_length=64, blank=True)
    ts = models.DateTimeField(auto_now_add=True)
    dwell_ms = models.PositiveIntegerField(default=0, help_text="Dwell time in milliseconds (if applicable).")

    class Meta:
        indexes = [
            models.Index(fields=["poll", "ts"], name="idx_event_poll_ts"),
            models.Index(fields=["kind", "ts"], name="idx_event_kind_ts"),
        ]
        ordering = ["-ts"]

    def __str__(self) -> str:
        return f"Event({self.kind}) on Poll#{self.poll_id}"


class PollAgg(models.Model):
    """
    Aggregated analytics metrics for a poll, periodically updated from Event.
    """
    poll = models.OneToOneField(
        "polls.Poll",
        on_delete=models.CASCADE,
        related_name="agg",
        help_text="The poll this aggregate record belongs to.",
    )

    # Cumulative metrics
    views = models.PositiveIntegerField(default=0)
    votes = models.PositiveIntegerField(default=0)
    shares = models.PositiveIntegerField(default=0)
    dwell_ms_sum = models.BigIntegerField(default=0)
    dwell_ms_avg = models.IntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["-updated_at"], name="idx_pollagg_updated_at"),
        ]
        verbose_name = "Poll Analytics"
        verbose_name_plural = "Poll Analytics"

    def __str__(self) -> str:
        return f"PollAgg(Poll#{self.poll_id}) views={self.views} votes={self.votes}"
