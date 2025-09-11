from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Poll
from .models_report import Report
from .constants import TargetType, REPORT_REASONS
from .models_comments import Comment

User = get_user_model()

class ReportCreateSerializer(serializers.ModelSerializer):
    target_type = serializers.ChoiceField(choices=[(t.value, t.value) for t in TargetType])
    reason = serializers.ChoiceField(choices=[(k, v) for k, v in REPORT_REASONS.items()])

    class Meta:
        model = Report
        fields = ('id','target_type','target_id','reason')

    def validate(self, data):
        if data['target_type'] == TargetType.POLL.value:
            if not Poll.objects.filter(id=data['target_id']).exists():
                raise serializers.ValidationError({'target_id': 'Poll not found'})
        if data['target_type'] == TargetType.COMMENT.value:
            if not Comment.objects.filter(id=data['target_id']).exists():
                raise serializers.ValidationError({'target_id':'Comment not found'})

        return data

    def create(self, validated):
        user = self.context['request'].user if self.context['request'].user.is_authenticated else None
        return Report.objects.create(reporter=user, **validated)

class ReportListSerializer(serializers.ModelSerializer):
    reporter_email = serializers.SerializerMethodField()
    class Meta:
        model = Report
        fields = ('id','target_type','target_id','reason','created_at','reporter_email')
    def get_reporter_email(self, obj):
        return getattr(obj.reporter, 'email', None)

class ModerationActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=[('hide','hide'),('unhide','unhide'),('freeze','freeze'),('unfreeze','unfreeze')])
