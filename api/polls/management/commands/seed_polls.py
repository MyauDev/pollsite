from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from polls.models import Poll, PollOption, Topic, PollTopic
from random import randint, sample, choice
from django.utils.text import slugify

User = get_user_model()

TOPICS = [
    'Tech', 'Games', 'Movies', 'Music', 'Food', 'Travel', 'Sport', 'Books', 'AI', 'Design'
]

POLL_DATA = [
    {
        'title': 'Which programming language do you prefer for web development?',
        'description': 'Share your favorite language for building modern web applications. Consider factors like ecosystem, performance, and developer experience.',
        'options': ['Python', 'JavaScript/TypeScript', 'Go', 'Rust', 'PHP'],
        'topics': ['Tech', 'AI']
    },
    {
        'title': 'Best open-world game of all time?',
        'description': 'Vote for the game that you think has the most immersive and engaging open world experience.',
        'options': ['The Witcher 3', 'Red Dead Redemption 2', 'Elden Ring', 'Skyrim', 'GTA V'],
        'topics': ['Games']
    },
    {
        'title': 'What\'s your favorite movie genre?',
        'description': 'Tell us which type of movies you enjoy watching the most.',
        'options': ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Romance'],
        'topics': ['Movies']
    },
    {
        'title': 'Which music streaming service do you use?',
        'description': 'Compare features, pricing, and music library quality across different platforms.',
        'options': ['Spotify', 'Apple Music', 'YouTube Music', 'Amazon Music', 'Tidal'],
        'topics': ['Music', 'Tech']
    },
    {
        'title': 'Best pizza topping combination?',
        'description': 'Settle the age-old debate about the perfect pizza toppings.',
        'options': ['Pepperoni & Mushrooms', 'Hawaiian (Pineapple)', 'Margherita', 'Meat Lovers', 'Veggie Supreme'],
        'topics': ['Food']
    },
    {
        'title': 'Dream vacation destination?',
        'description': 'Where would you go if money and time were no object?',
        'options': ['Japan', 'Iceland', 'New Zealand', 'Italy', 'Maldives', 'Norway'],
        'topics': ['Travel']
    },
    {
        'title': 'Which sport is the most entertaining to watch?',
        'description': 'Consider the excitement, skill level, and overall entertainment value.',
        'options': ['Football/Soccer', 'Basketball', 'American Football', 'Tennis', 'Formula 1'],
        'topics': ['Sport']
    },
    {
        'title': 'Favorite book series?',
        'description': 'Which book series captivated you the most?',
        'options': ['Harry Potter', 'Lord of the Rings', 'A Song of Ice and Fire', 'The Expanse', 'Foundation'],
        'topics': ['Books']
    },
    {
        'title': 'Which AI tool do you use most frequently?',
        'description': 'Share which AI assistant or tool has become essential in your daily workflow.',
        'options': ['ChatGPT', 'GitHub Copilot', 'Claude', 'Midjourney', 'Gemini'],
        'topics': ['AI', 'Tech']
    },
    {
        'title': 'Best design tool for UI/UX work?',
        'description': 'What\'s your go-to software for creating user interfaces and design mockups?',
        'options': ['Figma', 'Adobe XD', 'Sketch', 'Penpot', 'Framer'],
        'topics': ['Design', 'Tech']
    },
    {
        'title': 'What time do you prefer to work out?',
        'description': '',
        'options': ['Early Morning (5-8 AM)', 'Midday (11 AM-2 PM)', 'Evening (5-8 PM)', 'Night (8+ PM)', 'I don\'t work out'],
        'topics': ['Sport']
    },
    {
        'title': 'Which framework for frontend development?',
        'description': 'Choose your preferred JavaScript framework for building user interfaces.',
        'options': ['React', 'Vue', 'Angular', 'Svelte', 'Solid'],
        'topics': ['Tech', 'Design']
    },
    {
        'title': 'Coffee or tea?',
        'description': 'The eternal question for hot beverage enthusiasts.',
        'options': ['Coffee', 'Tea', 'Both equally', 'Neither'],
        'topics': ['Food']
    },
    {
        'title': 'Best sci-fi movie ever made?',
        'description': 'Vote for the science fiction film that had the biggest impact on the genre.',
        'options': ['Blade Runner', 'The Matrix', 'Interstellar', '2001: A Space Odyssey', 'Inception'],
        'topics': ['Movies']
    },
    {
        'title': 'How do you prefer to read books?',
        'description': '',
        'options': ['Physical books', 'E-reader (Kindle, etc.)', 'Audiobooks', 'Tablets/phones', 'I don\'t read books'],
        'topics': ['Books', 'Tech']
    },
]

class Command(BaseCommand):
    help = 'Seed demo polls with options and topics'

    def handle(self, *args, **options):
        user, _ = User.objects.get_or_create(username='demo', defaults={"email": "demo@example.com"})
        
        # Create topics
        topics_map = {}
        for name in TOPICS:
            t, _ = Topic.objects.get_or_create(name=name, defaults={'slug': slugify(name)})
            topics_map[name] = t

        # Create polls from predefined data
        for poll_data in POLL_DATA:
            poll = Poll.objects.create(
                author=user,
                title=poll_data['title'],
                description=poll_data['description'],
                type_multi=choice([False, False, False, True]),  # 25% chance of multi-select
                results_mode=choice(['open', 'open', 'open', 'hidden_until_vote']),  # Mostly open
                visibility='public',
            )
            
            # Create options
            for idx, option_text in enumerate(poll_data['options']):
                PollOption.objects.create(poll=poll, text=option_text, order=idx)
            
            # Assign topics
            for topic_name in poll_data['topics']:
                if topic_name in topics_map:
                    PollTopic.objects.get_or_create(poll=poll, topic=topics_map[topic_name])

        # Create additional random polls to reach 30
        remaining = 30 - len(POLL_DATA)
        for i in range(remaining):
            poll = Poll.objects.create(
                author=user,
                title=f"Quick Poll: What's your preference? #{i+1}",
                description=choice([
                    '',
                    'Share your thoughts on this topic.',
                    'Help us understand your preferences better.',
                    'Quick survey to gather community opinions.',
                ]),
                type_multi=choice([False, False, True]),
                results_mode=choice(['open', 'hidden_until_vote']),
                visibility='public',
            )
            
            option_sets = [
                ["Yes", "No", "Maybe"],
                ["Agree", "Disagree", "Neutral"],
                ["Love it", "Like it", "It's okay", "Don't like it"],
                ["Definitely", "Probably", "Not sure", "Probably not"],
            ]
            
            chosen_options = choice(option_sets)
            for idx, txt in enumerate(chosen_options):
                PollOption.objects.create(poll=poll, text=txt, order=idx)

            # Random topics
            for t in sample(list(topics_map.values()), k=randint(1, 2)):
                PollTopic.objects.get_or_create(poll=poll, topic=t)

        self.stdout.write(self.style.SUCCESS(f'Seeded {len(POLL_DATA) + remaining} polls with descriptions and varied options'))