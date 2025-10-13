# polls/models/magiclink.py
from datetime import timedelta
import secrets
from django.conf import settings  # noqa: F401  (kept for symmetry if needed elsewhere)
from django.db import models
from django.utils import timezone

class MagicLinkToken(models.Model):
    """
    One-time code + token pair for email-based magic-link authentication.
    """
    email = models.EmailField(db_index=True)
    code = models.CharField(max_length=6)
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [models.Index(fields=["email", "created_at"])]

    def is_valid(self) -> bool:
        now = timezone.now()
        return self.used_at is None and now < self.expires_at

    @staticmethod
    def generate(email: str, ttl_minutes: int = 15):
        """
        Create a token for the given email with a numeric 6-digit code.
        """
        code = f"{secrets.randbelow(1_000_000):06d}"
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=ttl_minutes)
        return MagicLinkToken.objects.create(
            email=email.lower(),
            code=code,
            token=token,
            expires_at=expires_at,
        )
