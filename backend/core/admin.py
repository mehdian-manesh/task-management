from django.contrib import admin
from .models import Project, Task, WorkingDay, Report, Feedback


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'start_date', 'deadline', 'estimated_hours', 'created_at']
    list_filter = ['status', 'start_date', 'deadline']
    search_fields = ['name', 'description']
    filter_horizontal = ['assignees']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'status', 'is_draft', 'phase', 'created_by', 'created_at']
    list_filter = ['status', 'is_draft', 'phase', 'project']
    search_fields = ['name', 'description']
    filter_horizontal = ['assignees']
    readonly_fields = ['created_by', 'created_at', 'updated_at']


@admin.register(WorkingDay)
class WorkingDayAdmin(admin.ModelAdmin):
    list_display = ['user', 'check_in', 'check_out', 'is_on_leave']
    list_filter = ['is_on_leave', 'check_in', 'check_out']
    search_fields = ['user__username']
    readonly_fields = ['check_in']


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['working_day', 'task', 'result', 'start_time', 'end_time']
    list_filter = ['result', 'start_time', 'end_time']
    search_fields = ['comment', 'task__name']


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ['user', 'type', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['description', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
