# polls/models/poll.py
from __future__ import annotations
from django.db import models
from django.utils import timezone
from polls.models import User  # keep the concrete reference used in your project

class ResultsMode(models.TextChoices):
    OPEN = "open", "Open (visible to all)"
    HIDDEN_UNTIL_VOTE = "hidden_until_vote", "Hidden until user votes"
    HIDDEN_UNTIL_CLOSE = "hidden_until_close", "Hidden until poll closes"

class VisibilityMode(models.TextChoices):
    PUBLIC = "public", "Public"
    LINK = "link", "By link"

class Poll(models.Model):
    """
    Main poll entity.
    """
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="polls")

    title = models.CharField(max_length=240)
    description = models.TextField(blank=True)

    # Settings
    type_multi = models.BooleanField(default=False, help_text="Allow multiple choice")
    results_mode = models.CharField(max_length=32, choices=ResultsMode.choices, default=ResultsMode.OPEN)
    visibility = models.CharField(max_length=16, choices=VisibilityMode.choices, default=VisibilityMode.PUBLIC)

    media_url = models.URLField(blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)

    # Service flags
    is_frozen = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)

    # Moderation flags
    under_review = models.BooleanField(default=False)
    reports_total = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    topics = models.ManyToManyField("polls.Topic", through="polls.PollTopic", related_name="polls")

    class Meta:
        indexes = [
            models.Index(fields=["-created_at"], name="poll_created_idx"),
            models.Index(fields=["visibility", "-created_at"], name="poll_vis_created_idx"),
            models.Index(fields=["under_review", "-created_at"], name="poll_under_review_idx"),
            models.Index(fields=["-reports_total"], name="poll_reports_total_idx"),
        ]

    def __str__(self) -> str:
        return f"Poll({self.id}): {self.title[:40]}"

    @property
    def is_active(self) -> bool:
        """
        A poll is active if it is not hidden/frozen and not closed by time.
        """
        if self.is_hidden or self.is_frozen:
            return False
        if self.closes_at and timezone.now() >= self.closes_at:
            return False
        return True

class PollOption(models.Model):
    """
    Discrete selectable option within a poll.
    """
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=140)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = [("poll", "order")]
        ordering = ["order", "id"]

    def __str__(self) -> str:
        return f"Option({self.id}) of Poll({self.poll_id}): {self.text[:40]}"

class PollTopic(models.Model):
    """
    Through table for Poll <-> Topic relation.
    """
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE)
    topic = models.ForeignKey("polls.Topic", on_delete=models.CASCADE)

    class Meta:
        unique_together = [("poll", "topic")]
        indexes = [
            models.Index(fields=["topic", "poll"], name="polltopic_topic_poll_idx"),
        ]

    def __str__(self) -> str:
        return f"PollTopic(poll={self.poll_id}, topic={self.topic_id})"
