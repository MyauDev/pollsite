from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes as perm_decorator
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from polls.serializers import ProfileSerializer
from polls.models import FollowAuthor, Poll

User = get_user_model()

class ProfileViewSet(GenericViewSet):
    """
    Public profiles:
      - GET /profile/{username}/
      - POST /profile/{username}/follow/
      - POST /profile/{username}/unfollow/
      
    Note: /profile/me/ is handled by CurrentProfileView in views_profile.py
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @action(detail=False, methods=["get"], url_path=r"(?P<username>(?!me$)[^/]+)", permission_classes=[AllowAny])
    def get_profile(self, request, username=None):
        """Get public profile by username"""
        user = get_object_or_404(User, username=username)
        profile = user.profile
        
        # Count polls created by this user
        created_polls_count = Poll.objects.filter(author=user).count()
        
        # Count votes (if Vote model tracks user)
        votes_count = 0  # TODO: implement if Vote model has user field
        
        # Count followers and following
        followers_count = FollowAuthor.objects.filter(author=user).count()
        following_count = FollowAuthor.objects.filter(user=user).count()
        
        # Check if current user is following this profile
        is_following = False
        if request.user.is_authenticated:
            is_following = FollowAuthor.objects.filter(user=request.user, author=user).exists()
        
        data = {
            "id": profile.id,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email if request.user == user else None,
            },
            "display_name": profile.display_name or "",
            "bio": profile.bio or "",
            "avatar": request.build_absolute_uri(profile.avatar.url) if profile.avatar else None,
            "created_polls_count": created_polls_count,
            "votes_count": votes_count,
            "followers_count": followers_count,
            "following_count": following_count,
            "is_following": is_following,
        }
        
        return Response(data)

    @action(detail=False, methods=["post"], url_path=r"(?P<username>(?!me$)[^/]+)/follow", permission_classes=[IsAuthenticated])
    def follow(self, request, username=None):
        """Follow a user"""
        user_to_follow = get_object_or_404(User, username=username)
        
        if user_to_follow == request.user:
            return Response({"error": "Cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)
        
        FollowAuthor.objects.get_or_create(user=request.user, author=user_to_follow)
        return Response({"ok": True})

    @action(detail=False, methods=["post"], url_path=r"(?P<username>(?!me$)[^/]+)/unfollow", permission_classes=[IsAuthenticated])
    def unfollow(self, request, username=None):
        """Unfollow a user"""
        user_to_unfollow = get_object_or_404(User, username=username)
        
        FollowAuthor.objects.filter(user=request.user, author=user_to_unfollow).delete()
        return Response({"ok": True})

    @action(detail=False, methods=["get"], url_path=r"(?P<username>(?!me$)[^/]+)/comments", permission_classes=[AllowAny])
    def user_comments(self, request, username=None):
        """Get all comments by a user"""
        from polls.models import Comment
        from polls.serializers import CommentReadSerializer
        from django.db.models import Count
        
        user = get_object_or_404(User, username=username)
        
        # Get all visible comments by this user, ordered by newest first
        comments = (
            Comment.objects.filter(author=user, status="visible")
            .annotate(replies_count=Count("replies"))
            .select_related("poll")
            .order_by("-created_at")[:50]  # Limit to 50 most recent
        )
        
        # Serialize with additional poll info
        result = []
        for comment in comments:
            data = CommentReadSerializer(comment, context={"request": request}).data
            # Add poll title for context
            data["poll_title"] = comment.poll.title if comment.poll else None
            data["poll_id"] = comment.poll_id
            result.append(data)
        
        return Response({"results": result, "count": len(result)})

