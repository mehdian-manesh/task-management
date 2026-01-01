# Generated migration for UserSession model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_userprofile_domain'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token_jti', models.CharField(db_index=True, max_length=255)),
                ('refresh_token_jti', models.CharField(blank=True, max_length=255, null=True)),
                ('ip_address', models.GenericIPAddressField()),
                ('user_agent', models.TextField()),
                ('browser_name', models.CharField(max_length=100)),
                ('browser_version', models.CharField(blank=True, max_length=50, null=True)),
                ('device_type', models.CharField(max_length=50)),
                ('device_name', models.CharField(blank=True, max_length=200, null=True)),
                ('os_name', models.CharField(max_length=100)),
                ('os_version', models.CharField(blank=True, max_length=50, null=True)),
                ('screen_width', models.IntegerField(blank=True, null=True)),
                ('screen_height', models.IntegerField(blank=True, null=True)),
                ('login_date', models.DateTimeField(auto_now_add=True)),
                ('last_activity', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sessions', to='auth.user')),
            ],
            options={
                'ordering': ['-login_date'],
            },
        ),
        migrations.AddIndex(
            model_name='usersession',
            index=models.Index(fields=['user', '-login_date'], name='accounts_usersession_user_login_idx'),
        ),
        migrations.AddIndex(
            model_name='usersession',
            index=models.Index(fields=['token_jti'], name='accounts_usersession_token_jti_idx'),
        ),
    ]

