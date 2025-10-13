import re

STOPWORDS = [
    # Примеры; расширяй по необходимости
    r"\b(дурак|идиот|тупой)\b",
    r"\b(nazi|наци)\w*\b",
]

RE_LIST = [re.compile(pat, re.I | re.U) for pat in STOPWORDS]

def has_toxic(text: str) -> bool:
    if not text:
        return False
    return any(r.search(text) for r in RE_LIST)
