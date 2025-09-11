from enum import Enum


class TargetType(str, Enum):
    POLL = 'poll'
    COMMENT = 'comment' # на будущее


REPORT_REASONS = {
    'spam': 'Спам или само‑промо',
    'abuse': 'Оскорбительный контент',
    'nsfw': 'NSFW/18+',
    'illegal': 'Незаконный контент',
    'other': 'Другое',
}
