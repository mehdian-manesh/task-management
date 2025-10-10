import enum

from django.contrib.auth.models import User
from django.db import models

class StatusChoices(enum.Enum):
    POSTPONE = 'postpone'
    BACKLOG = 'backlog'
    TODO = 'todo'
    DOING = 'doing'
    TEST = 'test'
    DONE = 'done'
    ARCHIVE = 'archive'

class ReportResultChoices(enum.Enum):
    ONGOING = 'ongoing'  # هنوز تمام نشده
    SUCCESS = 'success'  # با موفقیت انجام شد
    POSTPONED = 'postponed'  # به تعویق افتاد
    FAILED = 'failed'  # موفق به انجام آن نشدم
    CANCELLED = 'cancelled'  # کنسل شد

class FeedbackTypeChoices(enum.Enum):
    CRITICISM = 'criticism'  # انتقاد
    SUGGESTION = 'suggestion'  # پیشنهاد
    QUESTION = 'question'  # سوال

class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, blank=True)  # e.g., hex code
    assignees = models.ManyToManyField(User, related_name='assigned_projects', blank=True)
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    estimated_hours = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=[(status.value, status.name.capitalize()) for status in StatusChoices],
        default=StatusChoices.BACKLOG.value
    )

class Task(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, blank=True)  # e.g., hex code
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    assignees = models.ManyToManyField(User, related_name='assigned_tasks', blank=True)
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    estimated_hours = models.PositiveIntegerField(default=0)
    phase = models.PositiveSmallIntegerField(default=0)  # Integer field for project phase
    is_draft = models.BooleanField(default=True)  # To distinguish draft from approved
    status = models.CharField(
        max_length=20,
        choices=[(status.value, status.name.capitalize()) for status in StatusChoices],
        default=StatusChoices.BACKLOG.value
    )

class WorkingDay(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='working_days')
    check_in = models.DateTimeField(auto_now_add=True)  # Automatically set on creation (check-in)
    check_out = models.DateTimeField(null=True, blank=True)  # Set manually on check-out

class Report(models.Model):
    working_day = models.ForeignKey(WorkingDay, on_delete=models.CASCADE, related_name='reports')
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='reports')
    result = models.CharField(
        max_length=20,
        choices=[(result.value, result.name.capitalize()) for result in ReportResultChoices],
        default=ReportResultChoices.ONGOING.value
    )
    comment = models.TextField(max_length=1000, blank=True)  # Optional, up to 1000 characters
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)

class Feedback(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbacks')
    description = models.TextField()  # Mandatory explanation text
    type = models.CharField(
        max_length=20,
        choices=[(ftype.value, ftype.name.capitalize()) for ftype in FeedbackTypeChoices],
        null=True,
        blank=True
    )  # Optional