from django.contrib.auth import get_user_model, authenticate, password_validation
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

User = get_user_model()


class SignupSerializer(serializers.Serializer):
    """
    Регистрация пользователя:
    - Обязательны username, email, password.
    - Проверяются уникальность email и username, сложность пароля.
    """
    username = serializers.RegexField(
        regex=r'^[a-zA-Z0-9_.-]{3,32}$',
        required=True,
        error_messages={
            'invalid': _('Username may contain letters, numbers, dot, dash or underscore')
        }
    )
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_username(self, v):
        v = v.strip()
        if User.objects.filter(username__iexact=v).exists():
            raise serializers.ValidationError(_('Username already taken'))
        return v

    def validate_email(self, v):
        v = v.lower().strip()
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError(_('Email already registered'))
        return v

    def validate_password(self, v):
        password_validation.validate_password(v)
        return v

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )


class LoginSerializer(serializers.Serializer):
    """
    Авторизация:
    - Поле identifier может быть username ИЛИ email.
    - Пароль обязателен.
    """
    identifier = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = attrs.get('identifier', '').strip()
        password = attrs.get('password')

        # Попытка аутентификации через кастомный backend
        user = authenticate(username=identifier, password=password)

        if not user:
            raise serializers.ValidationError(_('Invalid username/email or password'))
        if not user.is_active:
            raise serializers.ValidationError(_('Inactive user'))

        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    """
    Смена пароля:
    - Проверяет старый пароль.
    - Проверяет сложность нового пароля.
    """
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['old_password']):
            raise serializers.ValidationError({'old_password': _('Wrong password')})
        password_validation.validate_password(attrs['new_password'], user)
        return attrs


class ResetPasswordRequestSerializer(serializers.Serializer):
    """
    Запрос сброса пароля (по email).
    """
    email = serializers.EmailField()


class ResetPasswordConfirmSerializer(serializers.Serializer):
    """
    Подтверждение сброса пароля (через uid+token).
    """
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, v):
        password_validation.validate_password(v)
        return v
