from django.db import models
from django.conf import settings
from django.utils import timezone
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL 

class Comment(models.Model):
    class Status(models.TextChoices):
        VISIBLE = 'visible', 'visible'
        HIDDEN = 'hidden', 'hidden'

    poll = models.ForeignKey('polls.Poll', on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='comments')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')

    content = models.TextField(max_length=2000)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.VISIBLE)

    device_hash = models.CharField(max_length=64, blank=True, null=True)
    ip_hash = models.CharField(max_length=64, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['poll', '-created_at'], name='idx_comment_poll_created'),
            models.Index(fields=['parent', 'created_at'], name='idx_comment_parent_created'),
        ]

    def __str__(self):
        return f"C#{self.id} P{self.poll_id} by {self.author_id or 'anon'}: {self.content[:30]}"

