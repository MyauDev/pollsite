from rest_framework import serializers
from django.utils.html import strip_tags
from .models_comments import Comment
from .toxicity import has_toxic

MAX_LEN = 2000

class CommentReadSerializer(serializers.ModelSerializer):
    author_email = serializers.SerializerMethodField()
    replies_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Comment
        fields = ('id','poll','parent','content','status','author_email','created_at','replies_count')
    def get_author_email(self, obj):
        a = getattr(obj, 'author', None)
        return getattr(a, 'email', None)

class CommentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ('poll','parent','content')
    def validate_content(self, v: str):
        v = strip_tags((v or '').strip())
        if not v:
            raise serializers.ValidationError('empty')
        if len(v) > MAX_LEN:
            raise serializers.ValidationError('too long')
        if has_toxic(v):
            # мягкая модерация: помечаем как скрытый
            self.context['force_hidden'] = True
        return v
