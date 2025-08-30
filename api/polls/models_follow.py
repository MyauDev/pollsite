from django.conf import settings
from django.db import models


User = settings.AUTH_USER_MODEL


class FollowTopic(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follow_topics')
    topic = models.ForeignKey('polls.Topic', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)


class Meta:
    unique_together = [('user', 'topic')]
    indexes = [
    models.Index(fields=['user', 'topic'], name='idx_followtopic_user_topic'),
    ]


class FollowAuthor(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follow_authors')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='author_followers')
    created_at = models.DateTimeField(auto_now_add=True)


class Meta:
    unique_together = [('user', 'author')]
    indexes = [
    models.Index(fields=['user', 'author'], name='idx_follows_user_author'),
    ]