# polls/serializers/profile.py
from rest_framework import serializers
from polls.models import UserProfile

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["public_nickname", "age", "gender", "avatar"]
