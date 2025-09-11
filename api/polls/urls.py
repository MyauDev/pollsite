from django.urls import path

from .views import FeedView, PollDetailView
from .views_crud import PollCreateView, PollUpdateView, PollDeleteView
from .views_vote import VoteView
from .views_stream import PollStreamView
from .views_follow import TopicListView, FollowTopicView, FollowAuthorView
from .views_moderation import ReportCreateView, ReportListView, ModerationActionView
from .views_analytics import CollectEventView
from .views_author import AuthorDashboardView


urlpatterns = [
    # Feed & Polls
    path('feed', FeedView.as_view(), name='feed'),
    path('polls/<int:pk>', PollDetailView.as_view(), name='poll-detail'),

    # CRUD for Polls
    path('polls', PollCreateView.as_view(), name='poll-create'),  # POST
    path('polls/<int:pk>/update', PollUpdateView.as_view(), name='poll-update'),  # GET/PUT/PATCH
    path('polls/<int:pk>/delete', PollDeleteView.as_view(), name='poll-delete'),  # DELETE

    # Voting
    path('vote', VoteView.as_view(), name='vote'),  # POST

    # Streaming
    path('stream/polls/<int:pk>', PollStreamView.as_view(), name='poll-stream'),

    # Topics & Authors
    path('topics', TopicListView.as_view(), name='topics-list'),
    path('topics/<int:topic_id>/follow', FollowTopicView.as_view(), name='topic-follow'),
    path('authors/<int:author_id>/follow', FollowAuthorView.as_view(), name='author-follow'),

    # Moderation
    path('reports', ReportCreateView.as_view(), name='report-create'),  # POST (AllowAny)
    path('moderation/reports', ReportListView.as_view(), name='report-list'),  # GET (moderator)
    path(
        'moderation/polls/<int:poll_id>/action',
        ModerationActionView.as_view(),
        name='moderation-action'
    ),  # POST (moderator)

    # Analytics
    path('events', CollectEventView.as_view(), name='events-collect'),

    # Author Dashboard
    path('author/dashboard', AuthorDashboardView.as_view(), name='author-dashboard'),
]
