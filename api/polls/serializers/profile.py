# polls/serializers/profile.py
from rest_framework import serializers
from polls.models import UserProfile

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    avatar_url = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProfile
        fields = [
            "username",
            "public_nickname", 
            "display_name",
            "bio",
            "age", 
            "gender", 
            "avatar",
            "avatar_url",
            "is_private",
        ]
        extra_kwargs = {
            'avatar': {'write_only': True},
        }
    
    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

