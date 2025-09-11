from rest_framework import serializers
from .models import Poll, PollOption, ResultsMode, VisibilityMode
from django.utils import timezone
from .toxicity import has_toxic
class PollOptionWriteSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=140)

class PollWriteSerializer(serializers.ModelSerializer):
    options = PollOptionWriteSerializer(many=True)

    class Meta:
        model = Poll
        fields = ('id','title','description','type_multi','results_mode','visibility','media_url','closes_at','tags','options','is_hidden')
        read_only_fields = ()


    def validate(self, data):
        options = data.get('options') or []
        if not (2 <= len(options) <= 4):
            raise serializers.ValidationError({'options': 'Должно быть от 2 до 4 вариантов.'})
        texts = [o['text'].strip() for o in options if o.get('text')]
        if len(texts) != len(set(texts)):
            raise serializers.ValidationError({'options': 'Варианты не должны повторяться.'})
        closes_at = data.get('closes_at')
        if closes_at and closes_at <= timezone.now():
            raise serializers.ValidationError({'closes_at': 'Должна быть в будущем.'})
        rm = data.get('results_mode', ResultsMode.OPEN)
        vm = data.get('visibility', VisibilityMode.PUBLIC)
        if rm not in ResultsMode.values:
            raise serializers.ValidationError({'results_mode': 'Недопустимо.'})
        if vm not in VisibilityMode.values:
            raise serializers.ValidationError({'visibility': 'Недопустимо.'})
        if has_toxic(data.get('title','')) or has_toxic(data.get('description','')):
            # мягкая модерация: создаём, но скрываем до ручной проверки
            data['is_hidden'] = True

        return data

    def create(self, validated):
        options = validated.pop('options')
        poll = Poll.objects.create(author=self.context['request'].user, **validated)
        for idx, opt in enumerate(options):
            PollOption.objects.create(poll=poll, text=opt['text'].strip(), order=idx)
        return poll

    def update(self, instance: Poll, validated):
        options = validated.pop('options', None)
        for k, v in validated.items():
            setattr(instance, k, v)
        instance.save()
        if options is not None:
            instance.options.all().delete()
            for idx, opt in enumerate(options):
                PollOption.objects.create(poll=instance, text=opt['text'].strip(), order=idx)
        return instance