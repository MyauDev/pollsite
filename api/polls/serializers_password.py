from django.contrib.auth import get_user_model, authenticate, password_validation
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers


User = get_user_model()


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


    def validate_email(self, v):
        email = v.lower().strip()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(_('Email already registered'))
        return email


    def validate_password(self, v):
        password_validation.validate_password(v)
        return v


    def create(self, validated_data):
        email = validated_data['email']
        # username = email до @
        username = email.split('@')[0]
        user = User.objects.create_user(username=username, email=email, password=validated_data['password'])
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)


    def validate(self, attrs):
        email = attrs.get('email', '').lower().strip()
        password = attrs.get('password')
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(_('Invalid credentials'))
        if not user.check_password(password):
            raise serializers.ValidationError(_('Invalid credentials'))
        if not user.is_active:
            raise serializers.ValidationError(_('Inactive user'))
        attrs['user'] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)


    def validate(self, attrs):
        user = self.context['request'].user
        if not user.check_password(attrs['old_password']):
            raise serializers.ValidationError({'old_password': _('Wrong password')})
        password_validation.validate_password(attrs['new_password'], user)
        return attrs


class ResetPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)
    def validate_new_password(self, v):
        password_validation.validate_password(v)
        return v
