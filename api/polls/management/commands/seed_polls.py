from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from polls.models import Poll, PollOption, Topic, PollTopic
from random import randint, sample
from django.utils.text import slugify

User = get_user_model()

TOPICS = [
    'Tech', 'Games', 'Movies', 'Music', 'Food', 'Travel', 'Sport', 'Books', 'AI', 'Design'
]

class Command(BaseCommand):
    help = 'Seed demo polls with options and topics'

    def handle(self, *args, **options):
        user, _ = User.objects.get_or_create(username='demo', defaults={"email": "demo@example.com"})
        topics = []
        for name in TOPICS:
            t, _ = Topic.objects.get_or_create(name=name, defaults={'slug': slugify(name)})
            topics.append(t)

        for i in range(1, 31):
            poll = Poll.objects.create(
                author=user,
                title=f"Demo Poll #{i}: choose your favorite",
                type_multi=False,
                results_mode='open',
                visibility='public',
            )
            texts = ["Option A", "Option B", "Option C", "Option D"]
            for idx, txt in enumerate(texts[:randint(2,4)]):
                PollOption.objects.create(poll=poll, text=txt, order=idx)

            for t in sample(topics, k=randint(1,3)):
                PollTopic.objects.get_or_create(poll=poll, topic=t)

        self.stdout.write(self.style.SUCCESS('Seeded 30 polls'))