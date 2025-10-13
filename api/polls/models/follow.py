from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL


class FollowTopic(models.Model):
    """
    A user's subscription to a Topic.
    Ensures a user can follow a given topic only once.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="followed_topics",
        help_text="Follower (user who follows the topic).",
    )
    topic = models.ForeignKey(
        "polls.Topic",
        on_delete=models.CASCADE,
        help_text="Topic being followed.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "topic"],
                name="uniq_followtopic_user_topic",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "topic"], name="idx_followtopic_user_topic"),
        ]
        db_table = "polls_followtopic"
        verbose_name = "Follow topic"
        verbose_name_plural = "Follow topics"

    def __str__(self) -> str:
        return f"{self.user} → {self.topic}"


class FollowAuthor(models.Model):
    """
    A user's subscription to an Author (another user).
    Prevents self-follow and duplicates.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="followed_authors",
        help_text="Follower.",
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="author_followers",
        help_text="Author being followed.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "author"],
                name="uniq_followauthor_user_author",
            ),
            models.CheckConstraint(
                check=~models.Q(user=models.F("author")),
                name="no_self_follow",
            ),
        ]
        indexes = [
            models.Index(fields=["user", "author"], name="idx_follows_user_author"),
        ]
        db_table = "polls_followauthor"
        verbose_name = "Follow author"
        verbose_name_plural = "Follow authors"

    def __str__(self) -> str:
        return f"{self.user} → {self.author}"
