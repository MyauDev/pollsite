# polls/serializers/poll_read.py
from __future__ import annotations
from rest_framework import serializers
from django.utils import timezone

from polls.models import (
    Poll,
    PollOption,
    PollStats,
    ResultsMode,
    Vote,
    Topic,
    PollTopic,
)
from lib.utils.network import sha256_hex


class PollOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PollOption
        fields = ("id", "text", "order")


class PollStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PollStats
        fields = ("total_votes", "option_counts", "updated_at")


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ("id", "name", "slug")


class PollBaseSerializer(serializers.ModelSerializer):
    """
    Read serializer for a poll with options, stats, topics and user vote context.
    """
    options = PollOptionSerializer(many=True, read_only=True)
    stats = PollStatsSerializer(read_only=True)
    topics = serializers.SerializerMethodField()
    results_available = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = (
            "id",
            "title",
            "description",
            "type_multi",
            "results_mode",
            "visibility",
            "media_url",
            "closes_at",
            "created_at",
            "updated_at",
            "options",
            "stats",
            "topics",
            "results_available",
            "user_vote",
            "author",
        )

    def get_topics(self, obj: Poll):
        """
        Return topics associated with this poll.
        Uses prefetched through objects when available.
        """
        if hasattr(obj, "_prefetched_objects_cache") and "polltopic_set" in obj._prefetched_objects_cache:
            topics = [pt.topic for pt in obj.polltopic_set.all()]
            topics.sort(key=lambda t: t.name)
        else:
            topics = Topic.objects.filter(
                id__in=PollTopic.objects.filter(poll=obj).values_list("topic_id", flat=True)
            ).order_by("name")
        return TopicSerializer(topics, many=True).data

    def get_results_available(self, obj: Poll) -> bool:
        """
        Results visibility logic:
        - OPEN: always visible
        - HIDDEN_UNTIL_CLOSE: visible after closes_at
        - HIDDEN_UNTIL_VOTE: visible if the current user/device has voted
        """
        if obj.results_mode == ResultsMode.OPEN:
            return True
        if obj.results_mode == ResultsMode.HIDDEN_UNTIL_CLOSE:
            return bool(obj.closes_at and timezone.now() >= obj.closes_at)
        if obj.results_mode == ResultsMode.HIDDEN_UNTIL_VOTE:
            return self.get_user_vote(obj) is not None
        return False

    def get_user_vote(self, obj: Poll):
        """
        Return the option ID voted by the current user or device (if any).
        """
        request = self.context.get("request")
        if not request:
            return None

        user = getattr(request, "user", None)
        if user and user.is_authenticated:
            vote = Vote.objects.filter(poll=obj, user=user).only("option_id").first()
            if vote:
                return vote.option_id

        device_id = request.headers.get("X-Device-Id")
        if not device_id:
            return None

        device_hash = sha256_hex(device_id)
        vote = Vote.objects.filter(poll=obj, device_hash=device_hash).only("option_id").first()
        return vote.option_id if vote else None

    def get_author(self, obj: Poll):
        """
        Return author information.
        """
        if obj.author:
            return {
                "username": obj.author.username,
                "first_name": obj.author.first_name,
                "last_name": obj.author.last_name,
            }
        return None


class PollDetailSerializer(PollBaseSerializer):
    """
    Extended read serializer with per-option percentages if results are available.
    """
    option_percents = serializers.SerializerMethodField()

    class Meta(PollBaseSerializer.Meta):
        fields = PollBaseSerializer.Meta.fields + ("option_percents",)

    def get_option_percents(self, obj: Poll):
        available = self.get_results_available(obj)
        if not available:
            return None
        stats = getattr(obj, "stats", None)
        if not stats or not stats.option_counts:
            return {}
        total = max(1, stats.total_votes)
        # Keys in option_counts are stored as strings; cast to int for API
        return {
            int(option_id): round((count / total) * 100, 2)
            for option_id, count in {int(k): v for k, v in stats.option_counts.items()}.items()
        }
