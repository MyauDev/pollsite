# polls/models_follow.py
from django.conf import settings
from django.db import models
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL 


class FollowTopic(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follow_topics')
    topic = models.ForeignKey('polls.Topic', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'topic'],
                name='uniq_followtopic_user_topic',
            )
        ]
        indexes = [
            models.Index(fields=['user', 'topic'], name='idx_followtopic_user_topic'),
        ]
        db_table = 'polls_followtopic'

    def __str__(self):
        return f'{self.user} → {self.topic}'


class FollowAuthor(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follow_authors')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='author_followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'author'],
                name='uniq_followauthor_user_author',
            ),
            models.CheckConstraint(
                check=~models.Q(user=models.F('author')),
                name='no_self_follow',
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'author'], name='idx_follows_user_author'),
        ]
        db_table = 'polls_followauthor'

    def __str__(self):
        return f'{self.user} → {self.author}'
