# polls/models/profile.py
from django.conf import settings
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.db import models
import random
import string

nickname_validator = RegexValidator(
    regex=r"^[a-z0-9-]{3,32}$",
    message="Allowed: lowercase letters, digits, dash (3–32 chars)",
)

class UserProfile(models.Model):
    """
    Public-facing profile for a user with a slug-like nickname generator.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    public_nickname = models.SlugField(
        max_length=32,
        unique=True,
        blank=True,
        null=True,
        validators=[nickname_validator],
    )
    age = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        validators=[MinValueValidator(1), MaxValueValidator(120)],
    )
    gender = models.CharField(
        max_length=1,
        choices=[("m", "Male"), ("f", "Female"), ("o", "Other")],
        blank=True,
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.public_nickname or 'no-nick'})"

    def _generate_unique_nickname(self, base: str | None = None) -> str:
        """
        Derive a lowercase slug from a base (username or email local-part).
        If collision or too short, fallback to random variants.
        """
        def normalize(x: str) -> str:
            allowed = set(string.ascii_lowercase + string.digits + "-")
            x = (x or "").lower()
            x = "".join(ch for ch in x if ch in allowed)
            return x[:32]

        if base:
            base = normalize(base)
            if len(base) >= 3 and not UserProfile.objects.filter(public_nickname=base).exists():
                return base
            # Try base-xxx up to 10 attempts
            for _ in range(10):
                suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=3))
                cand = (base[:28] + "-" + suffix) if base else f"u-{suffix}"
                if len(cand) >= 3 and not UserProfile.objects.filter(public_nickname=cand).exists():
                    return cand

        # Random fallback
        prefix = "u-"
        alphabet = string.ascii_lowercase + string.digits
        for _ in range(10):
            suffix = "".join(random.choices(alphabet, k=7))
            cand = f"{prefix}{suffix}"
            if not UserProfile.objects.filter(public_nickname=cand).exists():
                return cand
        return f"{prefix}{random.randrange(10**8, 10**9)}"

    def save(self, *args, **kwargs):
        if not self.public_nickname:
            base = getattr(self.user, "username", "") or getattr(self.user, "email", "")
            base = base.split("@")[0]
            self.public_nickname = self._generate_unique_nickname(base)
        super().save(*args, **kwargs)
