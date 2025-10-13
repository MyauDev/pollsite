# polls/models/topic.py
from django.db import models

class Topic(models.Model):
    """
    A thematic tag or category for polls.
    """
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
