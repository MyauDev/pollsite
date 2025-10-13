from enum import Enum

# polls/constants.py
AUTO_REVIEW_THRESHOLD = 3
AUTO_REVIEW_REASONS = {'spam', 'abuse', 'nsfw', 'illegal'}

class TargetType(str, Enum):
    POLL = 'poll'
    COMMENT = 'comment'


REPORT_REASONS = {
    'spam': 'Спам или само‑промо',
    'abuse': 'Оскорбительный контент',
    'nsfw': 'NSFW/18+',
    'illegal': 'Незаконный контент',
    'other': 'Другое',
}