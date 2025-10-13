import hashlib
from django.conf import settings


def get_client_ip(request) -> str:
    """
    Extract the client's IP address from request headers.
    Uses X-Forwarded-For if available, otherwise REMOTE_ADDR.
    """
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def sha256_hex(value: str) -> str:
    """
    Return a salted SHA-256 hash of the given string value.
    Uses part of SECRET_KEY as pepper to make hashes environment-specific.
    """
    if not value:
        return ""
    pepper = (settings.SECRET_KEY or "")[:16]
    h = hashlib.sha256()
    h.update((pepper + value).encode("utf-8"))
    return h.hexdigest()
