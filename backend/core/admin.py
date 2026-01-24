from django.contrib import admin
from .models import Project, Task, WorkingDay, Report, Feedback, Meeting, MeetingExternalParticipant


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


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ['topic', 'datetime', 'type', 'location', 'created_by', 'created_at']
    list_filter = ['type', 'datetime', 'created_at']
    search_fields = ['topic', 'summary', 'location']
    filter_horizontal = ['participants']
    readonly_fields = ['created_by', 'created_at', 'updated_at']
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only set created_by on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(MeetingExternalParticipant)
class MeetingExternalParticipantAdmin(admin.ModelAdmin):
    list_display = ['name', 'meeting', 'meeting_datetime']
    list_filter = ['meeting']
    search_fields = ['name', 'meeting__topic']
    
    def meeting_datetime(self, obj):
        return obj.meeting.datetime
    meeting_datetime.short_description = 'Meeting Date/Time'
