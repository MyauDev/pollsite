from rest_framework import serializers
from django.db import transaction
from django.utils import timezone

from .models import Poll, PollOption, Topic, PollTopic, ResultsMode, VisibilityMode
from .toxicity import has_toxic


class PollOptionWriteSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=140, allow_blank=False)


class PollWriteSerializer(serializers.ModelSerializer):
    options = PollOptionWriteSerializer(many=True, write_only=True)
    topic_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        write_only=True,
        help_text="List of topic IDs to associate with this poll",
    )

    # сделаем опциональными то, что фронт может не слать
    tags = serializers.CharField(required=False, allow_blank=True)
    media_url = serializers.CharField(required=False, allow_blank=True)
    closes_at = serializers.DateTimeField(required=False, allow_null=True)
    is_hidden = serializers.BooleanField(required=False)

    class Meta:
        model = Poll
        fields = (
            'id', 'title', 'description', 'type_multi', 'results_mode', 'visibility',
            'media_url', 'closes_at', 'tags', 'options', 'is_hidden', 'topic_ids'
        )
        read_only_fields = ('id',)

    def _normalize_results_mode(self, value):
        # Принимаем enum, lowercase строки, мапим в значения модели
        if isinstance(value, ResultsMode):
            return value
        mapping = {
            'open': ResultsMode.OPEN,
            'hidden_until_vote': ResultsMode.HIDDEN_UNTIL_VOTE,
            'hidden_until_close': ResultsMode.HIDDEN_UNTIL_CLOSE,
        }
        try:
            return mapping[value]
        except KeyError:
            raise serializers.ValidationError('Недопустимое значение results_mode.')

    def _normalize_visibility(self, value):
        if isinstance(value, VisibilityMode):
            return value
        # Если в модели значения lowercase — просто вернуть:
        # return value
        # Если upper — раскомментируй:
        # return value.upper()
        return value

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

        # normalize enums/choices
        attrs['results_mode'] = self._normalize_results_mode(
            attrs.get('results_mode', ResultsMode.OPEN)
        )
        attrs['visibility'] = self._normalize_visibility(
            attrs.get('visibility', VisibilityMode.PUBLIC)
        )

        # topics exist?
        topic_ids = attrs.get('topic_ids') or []
        if topic_ids:
            existing = set(Topic.objects.filter(id__in=topic_ids).values_list('id', flat=True))
            invalid = [tid for tid in topic_ids if tid not in existing]
            if invalid:
                raise serializers.ValidationError({'topic_ids': f'Несуществующие топики: {invalid}'})

        # мягкая модерация токсичности: скрываем, но создаём
        title = (attrs.get('title') or '').strip()
        description = (attrs.get('description') or '').strip()
        if has_toxic(title) or has_toxic(description):
            attrs['is_hidden'] = True

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        options = validated_data.pop('options')
        topic_ids = validated_data.pop('topic_ids', [])

        poll = Poll.objects.create(author=self.context['request'].user, **validated_data)  # type: ignore

        # создаём опции с порядком
        rows = [
            PollOption(poll=poll, text=opt['text'].strip(), order=idx)
            for idx, opt in enumerate(options)
        ]
        PollOption.objects.bulk_create(rows)

        # связываем топики
        if topic_ids:
            PollTopic.objects.bulk_create([
                PollTopic(poll=poll, topic_id=topic_id) for topic_id in topic_ids
            ])

        return poll

    @transaction.atomic
    def update(self, instance: Poll, validated_data):
        options = validated_data.pop('options', None)
        topic_ids = validated_data.pop('topic_ids', None)

        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        if options is not None:
            instance.options.all().delete()  # type: ignore
            PollOption.objects.bulk_create([
                PollOption(poll=instance, text=opt['text'].strip(), order=idx)
                for idx, opt in enumerate(options)
            ])

        if topic_ids is not None:
            PollTopic.objects.filter(poll=instance).delete()
            if topic_ids:
                PollTopic.objects.bulk_create([
                    PollTopic(poll=instance, topic_id=topic_id) for topic_id in topic_ids
                ])

        return instance

    def to_representation(self, instance):
        # минимальный ответ для фронта
        return {'id': instance.id}
