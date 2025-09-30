from rest_framework import serializers
from .models import Poll, PollOption, PollStats, ResultsMode, Vote, Topic
from django.utils import timezone
from .utils import sha256_hex

class PollOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PollOption
        fields = ('id', 'text', 'order')


class PollStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PollStats
        fields = ('total_votes', 'option_counts', 'updated_at')


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ('id', 'name', 'slug')


class PollBaseSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    stats = PollStatsSerializer(read_only=True)
    topics = serializers.SerializerMethodField()
    results_available = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = (
            'id', 'title', 'description', 'type_multi', 'results_mode', 'visibility', 'media_url',
            'closes_at', 'created_at', 'updated_at', 'options', 'stats', 'topics', 'results_available', 'user_vote'
        )

    def get_topics(self, obj: Poll):
        """Return topics associated with this poll"""
        # Use prefetched data if available, otherwise query
        if hasattr(obj, '_prefetched_objects_cache') and 'polltopic_set' in obj._prefetched_objects_cache:
            topics = [pt.topic for pt in obj.polltopic_set.all()]
            topics.sort(key=lambda t: t.name)
        else:
            from .models import PollTopic
            topics = Topic.objects.filter(
                id__in=PollTopic.objects.filter(poll=obj).values_list('topic_id', flat=True)
            ).order_by('name')
        return TopicSerializer(topics, many=True).data

    def get_results_available(self, obj: Poll) -> bool:
        # Для MVP: скрываем до закрытия, если так настроено. Логику "скрыть до голоса" подключим позже, когда появится has_voted.
        if obj.results_mode == ResultsMode.OPEN:
            return True
        if obj.results_mode == ResultsMode.HIDDEN_UNTIL_CLOSE:
            return bool(obj.closes_at and timezone.now() >= obj.closes_at)
        # hidden_until_vote → показываем результаты если пользователь уже голосовал
        if obj.results_mode == ResultsMode.HIDDEN_UNTIL_VOTE:
            return self.get_user_vote(obj) is not None
        return False

    def get_user_vote(self, obj: Poll):
        """Возвращает ID опции, за которую проголосовал пользователь, или None"""
        request = self.context.get('request')
        if not request:
            return None
        
        # First check if user is authenticated and has voted
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            try:
                vote = Vote.objects.filter(poll=obj, user=user).first()
                if vote:
                    return vote.option.id
            except:
                pass
        
        # Fallback to device-based voting for anonymous users
        device_id = request.headers.get('X-Device-Id')
        if not device_id:
            return None
        
        device_hash = sha256_hex(device_id)
        
        try:
            vote = Vote.objects.filter(
                poll=obj,
                device_hash=device_hash
            ).first()
            return vote.option.id if vote else None
        except:
            return None


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