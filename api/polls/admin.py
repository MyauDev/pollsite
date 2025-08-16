from django.contrib import admin
from .models import Poll, PollOption, Vote, PollStats, Topic, PollTopic

class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 2
    fields = ('order', 'text')

@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'is_active', 'visibility', 'results_mode', 'created_at')
    list_filter = ('visibility', 'results_mode', 'is_hidden', 'is_frozen', 'created_at')
    search_fields = ('title', 'author__email')
    inlines = [PollOptionInline]
    readonly_fields = ()

@admin.register(PollOption)
class PollOptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'poll', 'order', 'text')
    list_filter = ('poll',)

@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'poll', 'option', 'user', 'device_hash', 'ip_hash', 'created_at')
    list_filter = ('poll', 'option')
    search_fields = ('user__email', 'device_hash', 'ip_hash')

@admin.register(PollStats)
class PollStatsAdmin(admin.ModelAdmin):
    list_display = ('poll', 'total_votes', 'views', 'unique_viewers', 'updated_at')

@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug')
    search_fields = ('name', 'slug')

@admin.register(PollTopic)
class PollTopicAdmin(admin.ModelAdmin):
    list_display = ('poll', 'topic')
    list_filter = ('topic',)