# polls/models/user.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom user based on AbstractUser with an email-unique constraint
    and optional profile fields.
    """
    # Unique email to support email-based login
    email = models.EmailField("email address", unique=True, null=True, blank=True)

    # Optional profile fields
    public_nickname = models.CharField(max_length=64, null=True, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    GENDER_CHOICES = (
        ("m", "Male"),
        ("f", "Female"),
        ("o", "Other"),
        ("u", "Prefer not to say"),
    )
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)

    def __str__(self) -> str:
        return self.username or (self.email or f"User#{self.pk}")
