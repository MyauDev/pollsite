from rest_framework import serializers
from .models_profile import UserProfile

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['public_nickname', 'age', 'gender', 'avatar']
