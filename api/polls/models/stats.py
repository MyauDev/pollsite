# polls/models/stats.py
from django.db import models

class PollStats(models.Model):
    """
    Denormalized statistics for a poll for quick reads.
    """
    poll = models.OneToOneField("polls.Poll", on_delete=models.CASCADE, related_name="stats")

    views = models.PositiveIntegerField(default=0)
    unique_viewers = models.PositiveIntegerField(default=0)
    total_votes = models.PositiveIntegerField(default=0)
    # Counts per option: {option_id: count}
    option_counts = models.JSONField(default=dict)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["-updated_at"], name="pollstats_updated_idx"),
        ]

    def __str__(self) -> str:
        return f"PollStats({self.poll_id}) votes={self.total_votes}"
