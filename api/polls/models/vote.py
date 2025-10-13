# polls/models/vote.py
from django.db import models
from django.db.models import Q
from polls.models import User

class Vote(models.Model):
    """
    User vote for a specific option in a poll.
    Supports multiple identity channels (user/device/ip) with conditional uniqueness.
    """
    poll = models.ForeignKey("polls.Poll", on_delete=models.CASCADE, related_name="votes")
    option = models.ForeignKey("polls.PollOption", on_delete=models.CASCADE, related_name="votes")

    # Who voted
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="votes")
    ip_hash = models.CharField(max_length=64, blank=True, null=True)
    device_hash = models.CharField(max_length=64, blank=True, null=True)

    # Idempotency/audit
    idempotency_key = models.CharField(max_length=64, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["poll", "created_at"], name="vote_poll_created_idx"),
            models.Index(fields=["option"], name="vote_option_idx"),
            models.Index(fields=["user"], name="vote_user_idx"),
        ]
        constraints = [
            # One vote per poll for an authenticated user
            models.UniqueConstraint(
                fields=["poll", "user"],
                name="uniq_vote_poll_user",
                condition=Q(user__isnull=False),
            ),
            # One vote per poll for a device_hash (if provided)
            models.UniqueConstraint(
                fields=["poll", "device_hash"],
                name="uniq_vote_poll_device",
                condition=Q(device_hash__isnull=False),
            ),
            # One vote per poll for an ip_hash (if provided)
            models.UniqueConstraint(
                fields=["poll", "ip_hash"],
                name="uniq_vote_poll_ip",
                condition=Q(ip_hash__isnull=False),
            ),
        ]

    def __str__(self) -> str:
        ident = self.user_id or self.device_hash or self.ip_hash or "anon"
        return f"Vote(P{self.poll_id}/O{self.option_id}) by {ident}"
