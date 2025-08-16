from django.urls import path
from .views import FeedView, PollDetailView
from .views_crud import PollCreateView, PollUpdateView, PollDeleteView

urlpatterns = [
    path('feed', FeedView.as_view(), name='feed'),
    path('polls/<int:pk>', PollDetailView.as_view(), name='poll-detail'),
]

urlpatterns += [
    path('polls', PollCreateView.as_view(), name='poll-create'),            # POST
    path('polls/<int:pk>/update', PollUpdateView.as_view(), name='poll-update'),  # GET/PUT/PATCH
    path('polls/<int:pk>/delete', PollDeleteView.as_view(), name='poll-delete'),  # DELETE
]
