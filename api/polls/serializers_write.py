from rest_framework import serializers
from .models import Poll, PollOption, Topic, PollTopic, ResultsMode, VisibilityMode
from django.utils import timezone

class PollOptionWriteSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=140)

class PollWriteSerializer(serializers.ModelSerializer):
    options = PollOptionWriteSerializer(many=True)
    topic_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text="List of topic IDs to associate with this poll"
    )

    class Meta:
        model = Poll
        fields = ('id','title','description','type_multi','results_mode','visibility','media_url','closes_at','tags','options','topic_ids')

    def validate(self, attrs):
        options = attrs.get('options') or []
        if not (2 <= len(options) <= 4):
            raise serializers.ValidationError({'options': 'Должно быть от 2 до 4 вариантов.'})
        texts = [o['text'].strip() for o in options if o.get('text')]
        if len(texts) != len(set(texts)):
            raise serializers.ValidationError({'options': 'Варианты не должны повторяться.'})
        closes_at = attrs.get('closes_at')
        if closes_at and closes_at <= timezone.now():
            raise serializers.ValidationError({'closes_at': 'Должна быть в будущем.'})
        rm = attrs.get('results_mode', ResultsMode.OPEN)
        vm = attrs.get('visibility', VisibilityMode.PUBLIC)
        if rm not in ResultsMode.values:
            raise serializers.ValidationError({'results_mode': 'Недопустимо.'})
        if vm not in VisibilityMode.values:
            raise serializers.ValidationError({'visibility': 'Недопустимо.'})
        
        # Validate topics
        topic_ids = attrs.get('topic_ids', [])
        if topic_ids:
            existing_topics = Topic.objects.filter(id__in=topic_ids).values_list('id', flat=True)
            invalid_topics = set(topic_ids) - set(existing_topics)
            if invalid_topics:
                raise serializers.ValidationError({'topic_ids': f'Несуществующие топики: {list(invalid_topics)}'})
        
        return attrs

    def create(self, validated_data):
        options = validated_data.pop('options')
        topic_ids = validated_data.pop('topic_ids', [])
        poll = Poll.objects.create(author=self.context['request'].user, **validated_data)  # type: ignore
        
        # Create options
        for idx, opt in enumerate(options):
            PollOption.objects.create(poll=poll, text=opt['text'].strip(), order=idx)  # type: ignore
        
        # Associate topics
        for topic_id in topic_ids:
            PollTopic.objects.create(poll=poll, topic_id=topic_id)
        
        return poll

    def update(self, instance: Poll, validated_data):
        options = validated_data.pop('options', None)
        topic_ids = validated_data.pop('topic_ids', None)
        
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        
        if options is not None:
            instance.options.all().delete()  # type: ignore
            for idx, opt in enumerate(options):
                PollOption.objects.create(poll=instance, text=opt['text'].strip(), order=idx)  # type: ignore
        
        if topic_ids is not None:
            # Remove existing topic associations
            PollTopic.objects.filter(poll=instance).delete()
            # Create new associations
            for topic_id in topic_ids:
                PollTopic.objects.create(poll=instance, topic_id=topic_id)
        
        return instance