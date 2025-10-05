from django.db import models
from django.utils import timezone
import secrets
from datetime import timedelta
from django.conf import settings
from django.db import models

User = settings.AUTH_USER_MODEL 

class MagicLinkToken(models.Model):
    email = models.EmailField(db_index=True)
    code = models.CharField(max_length=6)
    token = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [models.Index(fields=['email', 'created_at'])]

    def is_valid(self) -> bool:
        now = timezone.now()
        return self.used_at is None and now < self.expires_at

    @staticmethod
    def generate(email: str, ttl_minutes: int = 15):
        code = f"{secrets.randbelow(1000000):06d}"
        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(minutes=ttl_minutes)
        return MagicLinkToken.objects.create(email=email.lower(), code=code, token=token, expires_at=expires_at)