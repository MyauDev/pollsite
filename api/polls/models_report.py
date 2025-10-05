from django.db import models
from django.conf import settings
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL 


class Report(models.Model):
    class TargetType(models.TextChoices):
        POLL = 'poll', 'Poll'
        COMMENT = 'comment', 'Comment'

    target_type = models.CharField(max_length=16, choices=TargetType.choices)
    target_id = models.PositiveIntegerField()
    reason = models.CharField(max_length=32)  # spam/abuse/nsfw/illegal/other
    reporter = models.ForeignKey(User, null=True, blank=True,
                                 on_delete=models.SET_NULL, related_name='reports')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report {self.id} {self.target_type}#{self.target_id} ({self.reason})"
