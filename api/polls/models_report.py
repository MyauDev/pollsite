from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL

class Report(models.Model):
    class TargetType(models.TextChoices):
        POLL = 'poll', 'Poll'
        COMMENT = 'comment', 'Comment'

    class Reason(models.TextChoices):
        SPAM = 'spam', 'Spam'
        ABUSE = 'abuse', 'Abuse'
        NSFW = 'nsfw', 'NSFW'
        ILLEGAL = 'illegal', 'Illegal'
        OTHER = 'other', 'Other'

    target_type = models.CharField(max_length=16, choices=TargetType.choices)
    target_id = models.PositiveIntegerField()
    reason = models.CharField(max_length=32, choices=Reason.choices)
    reporter = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='reports'
    )
    reporter_ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['target_type', 'target_id']),
            models.Index(fields=['-created_at']),
        ]
        constraints = [
            # один и тот же пользователь не может бесконечно репортить одно и то же по одной причине
            models.UniqueConstraint(
                fields=['reporter', 'target_type', 'target_id', 'reason'],
                name='uniq_report_by_user_target_reason',
                condition=models.Q(reporter__isnull=False)
            ),
        ]

    def __str__(self):
        return f"Report {self.id} {self.target_type}#{self.target_id} ({self.reason})"