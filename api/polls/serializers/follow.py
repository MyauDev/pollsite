from rest_framework import serializers
from polls.models import FollowTopic, FollowAuthor
# Reuse TopicSerializer from poll_read to avoid duplication
from polls.serializers.poll_read import TopicSerializer


class FollowTopicSerializer(serializers.ModelSerializer):
    topic = TopicSerializer(read_only=True)

    class Meta:
        model = FollowTopic
        fields = ("id", "topic", "created_at")


class FollowAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowAuthor
        fields = ("id", "author", "created_at")
