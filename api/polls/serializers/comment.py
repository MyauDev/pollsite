from rest_framework import serializers
from django.utils.html import strip_tags

from polls.models import Comment
from lib.text.toxicity import has_toxic

MAX_LEN = 2000


class CommentAuthorSerializer(serializers.Serializer):
    """Serializer for comment author info (user or anonymous)"""
    id = serializers.IntegerField(required=False)
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)


class CommentReadSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    replies_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Comment
        fields = ("id", "poll", "parent", "content", "status", "author", "created_at", "replies_count")

    def get_author(self, obj):
        """Return author info if authenticated, otherwise return None for anonymous"""
        if obj.author:
            return {
                "id": obj.author.id,
                "username": obj.author.username,
            }
        return None


class CommentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ("content", "parent")
        extra_kwargs = {
            "parent": {"required": False, "allow_null": True}
        }

    def validate_content(self, v: str):
        v = strip_tags((v or "").strip())
        if not v:
            raise serializers.ValidationError("empty")
        if len(v) > MAX_LEN:
            raise serializers.ValidationError("too long")
        if has_toxic(v):
            # Soft moderation: mark as hidden via context flag
            self.context["force_hidden"] = True
        return v
