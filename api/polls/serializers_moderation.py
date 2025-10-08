from django.db import transaction
from django.db.models import F
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Poll
from .models_report import Report
from .models_comments import Comment

# Moderation auto-review settings
# If you already keep these in constants.py, you can import them:
from .constants import AUTO_REVIEW_THRESHOLD, AUTO_REVIEW_REASONS
# AUTO_REVIEW_THRESHOLD = 3
# AUTO_REVIEW_REASONS = {'spam', 'abuse', 'nsfw', 'illegal'}

User = get_user_model()


class ReportCreateSerializer(serializers.ModelSerializer):
    target_type = serializers.ChoiceField(choices=Report.TargetType.choices)
    reason = serializers.ChoiceField(choices=Report.Reason.choices)

    class Meta:
        model = Report
        fields = ('id', 'target_type', 'target_id', 'reason')

    def validate(self, data):
        t = data['target_type']
        tid = data['target_id']

        if t == Report.TargetType.POLL:
            if not Poll.objects.filter(id=tid).exists():
                raise serializers.ValidationError({'target_id': 'Poll not found'})
        elif t == Report.TargetType.COMMENT:
            if not Comment.objects.filter(id=tid).exists():
                raise serializers.ValidationError({'target_id': 'Comment not found'})
        return data

    @transaction.atomic
    def create(self, validated):
        """Create report and softly push poll into 'under_review' state after threshold."""
        request = self.context.get('request')
        user = request.user if (request and request.user.is_authenticated) else None
        ip = None
        if request:
            # NOTE: trust X-Forwarded-For only if set by your proxy
            ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR'))
            if ip and ',' in ip:
                ip = ip.split(',')[0].strip()

        report = Report.objects.create(reporter=user, reporter_ip=ip, **validated)

        # Auto-review logic for polls (no auto-hide)
        if report.target_type == Report.TargetType.POLL and report.reason in AUTO_REVIEW_REASONS:
            # fast increment of cached counter
            Poll.objects.filter(id=report.target_id).update(reports_total=F('reports_total') + 1)

            # lock row to check threshold and set under_review atomically
            poll = Poll.objects.select_for_update().get(id=report.target_id)
            if not poll.under_review and poll.reports_total >= AUTO_REVIEW_THRESHOLD:
                poll.under_review = True
                poll.save(update_fields=['under_review'])

        return report


class ReportListSerializer(serializers.ModelSerializer):
    reporter_email = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = ('id', 'target_type', 'target_id', 'reason', 'created_at', 'reporter_email', 'reporter_ip')

    def get_reporter_email(self, obj):
        return getattr(obj.reporter, 'email', None)


class ModerationActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=[
        ('hide', 'hide'),
        ('unhide', 'unhide'),
        ('freeze', 'freeze'),
        ('unfreeze', 'unfreeze'),
        ('mark_reviewed', 'mark_reviewed'),  # NEW
    ])


class PollModerationQueueSerializer(serializers.ModelSerializer):
    """Lightweight serializer for moderation queue list."""
    class Meta:
        model = Poll
        fields = (
            'id', 'title', 'author_id', 'created_at',
            'under_review', 'reports_total', 'is_hidden', 'is_frozen'
        )
