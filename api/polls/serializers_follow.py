from rest_framework import serializers
from .models_follow import FollowTopic, FollowAuthor
from .models import Topic


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ('id', 'name', 'slug')


class FollowTopicSerializer(serializers.ModelSerializer):
    topic = TopicSerializer(read_only=True)
    class Meta:
        model = FollowTopic
        fields = ('id', 'topic', 'created_at')


class FollowAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = FollowAuthor
        fields = ('id', 'author', 'created_at')