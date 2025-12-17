# Generated manually for report system

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_alter_meeting_options_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReportNote',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('period_type', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('yearly', 'Yearly')], max_length=20)),
                ('jalali_year', models.IntegerField()),
                ('jalali_month', models.IntegerField(blank=True, null=True)),
                ('jalali_day', models.IntegerField(blank=True, null=True)),
                ('jalali_week', models.IntegerField(blank=True, null=True)),
                ('note', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_report_notes', to=settings.AUTH_USER_MODEL)),
                ('domain', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='report_notes', to='core.domain')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='SavedReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('report_type', models.CharField(choices=[('individual', 'Individual'), ('team', 'Team')], max_length=20)),
                ('period_type', models.CharField(choices=[('weekly', 'Weekly'), ('monthly', 'Monthly'), ('yearly', 'Yearly')], max_length=20)),
                ('jalali_year', models.IntegerField()),
                ('jalali_month', models.IntegerField(blank=True, null=True)),
                ('jalali_week', models.IntegerField(blank=True, null=True)),
                ('report_data', models.JSONField()),
                ('pdf_file', models.FileField(blank=True, null=True, upload_to='reports/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('domain', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='saved_reports', to='core.domain')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='saved_reports', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='savedreport',
            constraint=models.UniqueConstraint(fields=['report_type', 'period_type', 'jalali_year', 'jalali_month', 'jalali_week', 'user', 'domain'], name='unique_saved_report'),
        ),
    ]
