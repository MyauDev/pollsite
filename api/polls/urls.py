from django.urls import path
from .views import FeedView, PollDetailView
from .views_crud import PollCreateView, PollUpdateView, PollDeleteView
from .views_vote import VoteView
from .views_stream import PollStreamView

urlpatterns = [
    path('feed', FeedView.as_view(), name='feed'),
    path('polls/<int:pk>', PollDetailView.as_view(), name='poll-detail'),
]

urlpatterns += [
    path('polls', PollCreateView.as_view(), name='poll-create'),            # POST
    path('polls/<int:pk>/update', PollUpdateView.as_view(), name='poll-update'),  # GET/PUT/PATCH
    path('polls/<int:pk>/delete', PollDeleteView.as_view(), name='poll-delete'),  # DELETE
    path('vote', VoteView.as_view(), name='vote'),  # POST
]

urlpatterns += [
    path('stream/polls/<int:pk>', PollStreamView.as_view(), name='poll-stream'),
]
from .views_follow import TopicListView, FollowTopicView, FollowAuthorView


urlpatterns += [
path('topics', TopicListView.as_view(), name='topics-list'),
path('topics/<int:topic_id>/follow', FollowTopicView.as_view(), name='topic-follow'),
path('authors/<int:author_id>/follow', FollowAuthorView.as_view(), name='author-follow'),
]