from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings
from django.db.models import Q

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='Poll',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=240)),
                ('description', models.TextField(blank=True)),
                ('type_multi', models.BooleanField(default=False, help_text='Разрешить множественный выбор')),
                ('results_mode', models.CharField(choices=[('open', 'Open (видно всем)'), ('hidden_until_vote', 'Скрыть до голоса'), ('hidden_until_close', 'Скрыть до завершения')], default='open', max_length=32)),
                ('visibility', models.CharField(choices=[('public', 'Публичный'), ('link', 'По ссылке')], default='public', max_length=16)),
                ('media_url', models.URLField(blank=True)),
                ('closes_at', models.DateTimeField(blank=True, null=True)),
                ('is_frozen', models.BooleanField(default=False)),
                ('is_hidden', models.BooleanField(default=False)),
                ('tags', models.JSONField(default=list, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='polls', to=settings.AUTH_USER_MODEL)),
            ],
            options={'indexes': [models.Index(fields=['-created_at'], name='poll_created_idx'), models.Index(fields=['visibility', '-created_at'], name='poll_vis_created_idx')]},
        ),
        migrations.CreateModel(
            name='Topic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=80, unique=True)),
                ('slug', models.SlugField(max_length=100, unique=True)),
            ],
            options={'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='PollOption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('text', models.CharField(max_length=140)),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('poll', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='options', to='polls.poll')),
            ],
            options={'ordering': ['order', 'id'], 'unique_together': {('poll', 'order')}},
        ),
        migrations.CreateModel(
            name='PollTopic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('poll', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='polls.poll')),
                ('topic', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='polls.topic')),
            ],
            options={'unique_together': {('poll', 'topic')}},
        ),
        migrations.AddIndex(
            model_name='polltopic',
            index=models.Index(fields=['topic', 'poll'], name='polltopic_topic_poll_idx'),
        ),
        migrations.CreateModel(
            name='Vote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip_hash', models.CharField(blank=True, max_length=64, null=True)),
                ('device_hash', models.CharField(blank=True, max_length=64, null=True)),
                ('idempotency_key', models.CharField(blank=True, max_length=64, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('option', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='polls.polloption')),
                ('poll', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='votes', to='polls.poll')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='votes', to=settings.AUTH_USER_MODEL)),
            ],
            options={'indexes': [models.Index(fields=['poll', 'created_at'], name='vote_poll_created_idx'), models.Index(fields=['option'], name='vote_option_idx'), models.Index(fields=['user'], name='vote_user_idx')]},
        ),
        migrations.AddConstraint(
            model_name='vote',
            constraint=models.UniqueConstraint(fields=('poll', 'user'), name='uniq_vote_poll_user', condition=Q(('user__isnull', False))),
        ),
        migrations.AddConstraint(
            model_name='vote',
            constraint=models.UniqueConstraint(fields=('poll', 'device_hash'), name='uniq_vote_poll_device', condition=Q(('device_hash__isnull', False))),
        ),
        migrations.AddConstraint(
            model_name='vote',
            constraint=models.UniqueConstraint(fields=('poll', 'ip_hash'), name='uniq_vote_poll_ip', condition=Q(('ip_hash__isnull', False))),
        ),
        migrations.CreateModel(
            name='PollStats',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('views', models.PositiveIntegerField(default=0)),
                ('unique_viewers', models.PositiveIntegerField(default=0)),
                ('total_votes', models.PositiveIntegerField(default=0)),
                ('option_counts', models.JSONField(default=dict)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('poll', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='stats', to='polls.poll')),
            ],
            options={'indexes': [models.Index(fields=['-updated_at'], name='pollstats_updated_idx')]},
        ),
    ]