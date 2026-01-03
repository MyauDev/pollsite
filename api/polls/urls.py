from django.urls import path, include
from rest_framework.routers import SimpleRouter

from polls.viewsets.poll import PollViewSet
from polls.viewsets.topic import TopicViewSet
from polls.viewsets.follow import FollowAuthorViewSet
from polls.viewsets.comment import CommentViewSet
from polls.viewsets.auth import AuthViewSet
from polls.viewsets.profile import ProfileViewSet
from polls.viewsets.author import AuthorViewSet
from polls.viewsets.moderation import ReportViewSet, ModerationViewSet  # из предыдущего шага

from polls.views_stream import PollStreamView
from polls.views_social import GoogleCookieLogin
from polls.views_profile import CurrentProfileView

router = SimpleRouter()
router.register(r"polls", PollViewSet, basename="poll")
router.register(r"topics", TopicViewSet, basename="topic")
router.register(r"follow", FollowAuthorViewSet, basename="follow-author")
router.register(r"comments", CommentViewSet, basename="comment")  # for /comments/{id}/moderate
router.register(r"auth", AuthViewSet, basename="auth")
router.register(r"profile", ProfileViewSet, basename="profile")
router.register(r"author", AuthorViewSet, basename="author")
router.register(r"moderation/reports", ReportViewSet, basename="moderation-reports")
router.register(r"moderation", ModerationViewSet, basename="moderation")

urlpatterns = [
    path("profile/me/", CurrentProfileView.as_view(), name="profile-me"),
    path("polls/<int:pk>/stream", PollStreamView.as_view(), name="poll-stream"),
    path("auth/social/google", GoogleCookieLogin.as_view(), name="auth-social-google"),
    path("", include(router.urls)),
]
