from rest_framework import serializers
from .models import Poll, PollOption, PollStats, ResultsMode
from django.utils import timezone

class PollOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PollOption
        fields = ('id', 'text', 'order')


class PollStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PollStats
        fields = ('total_votes', 'option_counts', 'updated_at')


class PollBaseSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    stats = PollStatsSerializer(read_only=True)
    results_available = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = (
            'id', 'title', 'description', 'type_multi', 'results_mode', 'visibility', 'media_url',
            'closes_at', 'created_at', 'updated_at', 'options', 'stats', 'results_available'
        )

    def get_results_available(self, obj: Poll) -> bool:
        # Для MVP: скрываем до закрытия, если так настроено. Логику "скрыть до голоса" подключим позже, когда появится has_voted.
        if obj.results_mode == ResultsMode.OPEN:
            return True
        if obj.results_mode == ResultsMode.HIDDEN_UNTIL_CLOSE:
            return bool(obj.closes_at and timezone.now() >= obj.closes_at)
        # hidden_until_vote → ляжет на фронт, пока нет идентификации голоса
        return False


class PollDetailSerializer(PollBaseSerializer):
    # Добавим проценты по опциям (если доступно)
    option_percents = serializers.SerializerMethodField()

    class Meta(PollBaseSerializer.Meta):
        fields = PollBaseSerializer.Meta.fields + ('option_percents',)

    def get_option_percents(self, obj: Poll):
        available = self.get_results_available(obj)
        if not available:
            return None
        stats = getattr(obj, 'stats', None)
        if not stats or not stats.option_counts:
            return {}
        total = max(1, stats.total_votes)
        # ключи в option_counts сериализуются как строки
        return {
            int(option_id): round((count / total) * 100, 2)
            for option_id, count in {int(k): v for k, v in stats.option_counts.items()}.items()
        }