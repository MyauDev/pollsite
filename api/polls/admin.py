from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import Poll, PollOption, Vote, PollStats, Topic, PollTopic

User = get_user_model()


# --- Register User first so PollAdmin.autocomplete_fields can reference it ---
@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (_("Personal info"), {"fields": ("first_name", "last_name", "email", "public_nickname", "avatar", "gender", "age")}),
        (_("Permissions"), {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("username", "email", "password1", "password2")}),
    )
    list_display = ("id", "username", "email", "is_staff")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("id",)


# --- The rest of your admins ---
class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 2
    fields = ('order', 'text')
    ordering = ('order',)


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'title', 'author', 'is_active',
        'visibility', 'results_mode',
        'under_review', 'reports_total',  # NEW
        'is_hidden', 'is_frozen',
        'created_at',
    )
    list_filter = (
        'visibility', 'results_mode',
        'under_review',  # NEW
        'is_hidden', 'is_frozen',
        'created_at',
    )
    search_fields = ('title', 'author__username', 'author__email')
    inlines = [PollOptionInline]
    readonly_fields = ()
    autocomplete_fields = ('author',)
    list_select_related = ('author',)
    ordering = ('-under_review', '-reports_total', '-created_at')  # NEW: review items bubble up


@admin.register(PollOption)
class PollOptionAdmin(admin.ModelAdmin):
    list_display = ('id', 'poll', 'order', 'text')
    list_filter = ('poll',)
    search_fields = ('poll__title', 'text')
    list_select_related = ('poll',)
    ordering = ('poll', 'order')


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('id', 'poll', 'option', 'user', 'device_hash', 'ip_hash', 'created_at')
    list_filter = ('poll', 'option', 'created_at')
    search_fields = ('user__username', 'user__email', 'device_hash', 'ip_hash', 'poll__title', 'option__text')
    list_select_related = ('poll', 'option', 'user')
    raw_id_fields = ('poll', 'option', 'user')
    ordering = ('-created_at',)


@admin.register(PollStats)
class PollStatsAdmin(admin.ModelAdmin):
    list_display = ('poll', 'total_votes', 'views', 'unique_viewers', 'updated_at')
    list_select_related = ('poll',)
    search_fields = ('poll__title',)
    ordering = ('-updated_at',)


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug')
    search_fields = ('name', 'slug')
    ordering = ('name',)


@admin.register(PollTopic)
class PollTopicAdmin(admin.ModelAdmin):
    list_display = ('poll', 'topic')
    list_filter = ('topic',)
    search_fields = ('poll__title', 'topic__name', 'topic__slug')
    raw_id_fields = ('poll', 'topic')
    list_select_related = ('poll', 'topic')

