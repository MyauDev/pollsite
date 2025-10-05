from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Наш кастомный пользователь.
    Базируемся на AbstractUser, чтобы сохранить стандартные поля (username, password и т.д.)
    и просто добавить свои.
    """
    # сделаем email уникальным (для логина по email)
    email = models.EmailField("email address", unique=True, null=True, blank=True)

    # Доп. поля (пока опционально; можно использовать позже на странице профиля)
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