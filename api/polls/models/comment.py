from django.db import models
from django.conf import settings

User = settings.AUTH_USER_MODEL


class Comment(models.Model):
    """
    Represents a user comment under a poll.
    Supports threaded replies via self-referential parent field.
    """

    class Status(models.TextChoices):
        VISIBLE = "visible", "visible"
        HIDDEN = "hidden", "hidden"

    poll = models.ForeignKey(
        "polls.Poll",
        on_delete=models.CASCADE,
        related_name="comments",
        help_text="Poll to which this comment belongs.",
    )
    author = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="comments",
        help_text="User who wrote the comment (null if anonymous).",
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
        help_text="Parent comment for threaded replies.",
    )

    content = models.TextField(max_length=2000, help_text="Text content of the comment.")
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.VISIBLE,
        help_text="Visibility status (visible/hidden).",
    )

    device_hash = models.CharField(max_length=64, blank=True, null=True)
    ip_hash = models.CharField(max_length=64, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["poll", "-created_at"], name="idx_comment_poll_created"),
            models.Index(fields=["parent", "created_at"], name="idx_comment_parent_created"),
        ]
        ordering = ["-created_at"]
        verbose_name = "Comment"
        verbose_name_plural = "Comments"

    def __str__(self) -> str:
        author = self.author_id or "anon"
        return f"C#{self.id} P{self.poll_id} by {author}: {self.content[:30]}"
