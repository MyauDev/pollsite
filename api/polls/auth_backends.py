from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

class EmailOrUsernameModelBackend(ModelBackend):
    """Allow login by email OR username (case-insensitive)."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        # Be flexible with the incoming kwarg name and USERNAME_FIELD
        UserModel = get_user_model()
        login = username or kwargs.get(UserModel.USERNAME_FIELD) or kwargs.get("email")
        if not login or not password:
            return None  # let other backends try

        # Build case-insensitive query for email OR configured username field
        username_field = f"{UserModel.USERNAME_FIELD}__iexact"
        q = Q(email__iexact=login) | Q(**{username_field: login})

        # One safe query; avoid MultipleObjectsReturned
        user = UserModel._default_manager.only("id", "password", "is_active").filter(q).order_by("id").first()
        if not user:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
