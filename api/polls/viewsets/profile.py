from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework import status
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from polls.serializers import ProfileSerializer
from polls.models import FollowAuthor, Poll, UserProfile

User = get_user_model()


class ProfileViewSet(GenericViewSet):
    """
    Public profiles:
      GET  /profile/suggestions/
      GET  /profile/{username}/
      POST /profile/{username}/follow/
      POST /profile/{username}/unfollow/
      GET  /profile/{username}/followers/
      GET  /profile/{username}/following/
      GET  /profile/{username}/comments/
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _profile_data(self, profile, user, request_user):
        """Build the profile response dict."""
        created_polls_count = Poll.objects.filter(author=user).count()
        followers_count = FollowAuthor.objects.filter(author=user).count()
        following_count = FollowAuthor.objects.filter(user=user).count()
        is_following = False
        if request_user and request_user.is_authenticated:
            is_following = FollowAuthor.objects.filter(user=request_user, author=user).exists()

        return {
            "id": profile.id,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email if request_user == user else None,
            },
            "display_name": profile.display_name or "",
            "bio": profile.bio or "",
            "avatar": request_user.build_absolute_uri(profile.avatar.url) if (
                hasattr(request_user, 'build_absolute_uri') and profile.avatar
            ) else (profile.avatar.url if profile.avatar else None),
            "is_private": profile.is_private,
            "suggest_to_others": profile.suggest_to_others,
            "phone_number": profile.phone_number or "",
            "date_of_birth": str(profile.date_of_birth) if profile.date_of_birth else "",
            "account_region": profile.account_region or "",
            "created_polls_count": created_polls_count,
            "votes_count": 0,
            "followers_count": followers_count,
            "following_count": following_count,
            "is_following": is_following,
        }

    @action(detail=False, methods=["get"], url_path="suggestions", permission_classes=[AllowAny])
    def suggestions(self, request):
        """Return up to 5 suggested public profiles, ordered by follower count."""
        exclude_ids = []
        if request.user.is_authenticated:
            exclude_ids.append(request.user.id)
            # Also exclude already-followed authors
            followed = FollowAuthor.objects.filter(user=request.user).values_list("author_id", flat=True)
            exclude_ids.extend(list(followed))

        profiles = (
            UserProfile.objects
            .select_related("user")
            .filter(is_private=False, suggest_to_others=True)
            .exclude(user_id__in=exclude_ids)
            .order_by("-id")[:5]
        )

        result = []
        for profile in profiles:
            user = profile.user
            followers_count = FollowAuthor.objects.filter(author=user).count()
            result.append({
                "id": profile.id,
                "user": {"id": user.id, "username": user.username},
                "display_name": profile.display_name or "",
                "bio": profile.bio or "",
                "avatar": request.build_absolute_uri(profile.avatar.url) if profile.avatar else None,
                "is_following": False,
                "followers_count": followers_count,
                "following_count": 0,
                "created_polls_count": 0,
                "votes_count": 0,
            })
        return Response(result)

    @action(detail=False, methods=["get"], url_path=r"(?P<username>(?!me$)[^/]+)", permission_classes=[AllowAny])
    def get_profile(self, request, username=None):
        """Get public profile by username."""
        user = get_object_or_404(User, username=username)
        profile = user.profile
        created_polls_count = Poll.objects.filter(author=user).count()
        followers_count = FollowAuthor.objects.filter(author=user).count()
        following_count = FollowAuthor.objects.filter(user=user).count()
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
            "avatar_url": request.build_absolute_uri(profile.avatar.url) if profile.avatar else None,
            "is_private": profile.is_private,
            "suggest_to_others": profile.suggest_to_others,
            "phone_number": profile.phone_number or "",
            "date_of_birth": str(profile.date_of_birth) if profile.date_of_birth else "",
            "account_region": profile.account_region or "",
            "created_polls_count": created_polls_count,
            "votes_count": 0,
            "followers_count": followers_count,
            "following_count": following_count,
            "is_following": is_following,
        }
        return Response(data)

    @action(detail=False, methods=["post"], url_path=r"(?P<username>(?!me$)[^/]+)/follow", permission_classes=[IsAuthenticated])
    def follow(self, request, username=None):
        user_to_follow = get_object_or_404(User, username=username)
        if user_to_follow == request.user:
            return Response({"error": "Cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)
        FollowAuthor.objects.get_or_create(user=request.user, author=user_to_follow)
        return Response({"ok": True})

    @action(detail=False, methods=["post"], url_path=r"(?P<username>(?!me$)[^/]+)/unfollow", permission_classes=[IsAuthenticated])
    def unfollow(self, request, username=None):
        user_to_unfollow = get_object_or_404(User, username=username)
        FollowAuthor.objects.filter(user=request.user, author=user_to_unfollow).delete()
        return Response({"ok": True})

    @action(detail=False, methods=["get"], url_path=r"(?P<username>(?!me$)[^/]+)/followers", permission_classes=[AllowAny])
    def followers(self, request, username=None):
        """List followers of a user."""
        user = get_object_or_404(User, username=username)
        follows = FollowAuthor.objects.filter(author=user).select_related("user__profile")
        result = []
        for follow in follows:
            follower = follow.user
            profile = getattr(follower, "profile", None)
            is_following = False
            if request.user.is_authenticated:
                is_following = FollowAuthor.objects.filter(user=request.user, author=follower).exists()
            result.append({
                "id": profile.id if profile else None,
                "user": {"id": follower.id, "username": follower.username},
                "display_name": profile.display_name if profile else "",
                "avatar": request.build_absolute_uri(profile.avatar.url) if (profile and profile.avatar) else None,
                "is_following": is_following,
                "followers_count": 0,
                "following_count": 0,
                "created_polls_count": 0,
                "votes_count": 0,
            })
        return Response({"results": result, "count": len(result)})

    @action(detail=False, methods=["get"], url_path=r"(?P<username>(?!me$)[^/]+)/following", permission_classes=[AllowAny])
    def following(self, request, username=None):
        """List users that this user follows."""
        user = get_object_or_404(User, username=username)
        follows = FollowAuthor.objects.filter(user=user).select_related("author__profile")
        result = []
        for follow in follows:
            author = follow.author
            profile = getattr(author, "profile", None)
            is_following = False
            if request.user.is_authenticated:
                is_following = FollowAuthor.objects.filter(user=request.user, author=author).exists()
            result.append({
                "id": profile.id if profile else None,
                "user": {"id": author.id, "username": author.username},
                "display_name": profile.display_name if profile else "",
                "avatar": request.build_absolute_uri(profile.avatar.url) if (profile and profile.avatar) else None,
                "is_following": is_following,
                "followers_count": 0,
                "following_count": 0,
                "created_polls_count": 0,
                "votes_count": 0,
            })
        return Response({"results": result, "count": len(result)})

    @action(detail=False, methods=["get"], url_path=r"(?P<username>(?!me$)[^/]+)/comments", permission_classes=[AllowAny])
    def user_comments(self, request, username=None):
        """Get all comments by a user."""
        from polls.models import Comment
        from polls.serializers import CommentReadSerializer
        from django.db.models import Count

        user = get_object_or_404(User, username=username)
        comments = (
            Comment.objects.filter(author=user, status="visible")
            .annotate(replies_count=Count("replies"))
            .select_related("poll")
            .order_by("-created_at")[:50]
        )
        result = []
        for comment in comments:
            data = CommentReadSerializer(comment, context={"request": request}).data
            data["poll_title"] = comment.poll.title if comment.poll else None
            data["poll_id"] = comment.poll_id
            result.append(data)
        return Response({"results": result, "count": len(result)})
