from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('polls', '0003_userprofile_is_private'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='suggest_to_others',
            field=models.BooleanField(default=True, help_text='If true, this account may appear in suggestions to other users'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='phone_number',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='date_of_birth',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='account_region',
            field=models.CharField(blank=True, max_length=10),
        ),
    ]
