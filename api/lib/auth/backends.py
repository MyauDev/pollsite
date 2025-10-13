from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q


class EmailOrUsernameModelBackend(ModelBackend):
    """
    Authenticate by email OR username (case-insensitive).
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        login = username or kwargs.get(UserModel.USERNAME_FIELD) or kwargs.get("email")
        if not login or not password:
            return None

        username_field = f"{UserModel.USERNAME_FIELD}__iexact"
        q = Q(email__iexact=login) | Q(**{username_field: login})

        user = (
            UserModel._default_manager
            .only("id", "password", "is_active")
            .filter(q).order_by("id").first()
        )
        if not user:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
