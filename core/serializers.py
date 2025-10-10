from rest_framework import serializers

from .models import Project, Task, WorkingDay, Report, Feedback


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'  # Or specify: ['id', 'name', 'description', 'color', 'assignees', 'start_date', 'deadline', 'estimated_hours', 'status']


class TaskSerializer(serializers.ModelSerializer):
    project = ProjectSerializer(read_only=True)  # Nested for read, or use PrimaryKeyRelatedField for write

    class Meta:
        model = Task
        fields = '__all__'  # Or specify: ['id', 'name', 'description', 'color', 'project', 'assignees', 'start_date', 'deadline', 'estimated_hours', 'phase', 'is_draft', 'status']


class WorkingDaySerializer(serializers.ModelSerializer):
    reports = serializers.PrimaryKeyRelatedField(many=True,
                                                 read_only=True)  # Or use a nested ReportSerializer if full details are needed
    date = serializers.SerializerMethodField()

    def get_date(self, obj):
        return obj.check_in.date() if obj.check_in else None

    class Meta:
        model = WorkingDay
        fields = '__all__'  # Or specify: ['id', 'user', 'check_in', 'check_out', 'reports']
        read_only_fields = ['user']  # Ensure user is set to request.user in views


class ReportSerializer(serializers.ModelSerializer):
    task = TaskSerializer(read_only=True)  # Nested for details

    class Meta:
        model = Report
        fields = '__all__'  # Or specify: ['id', 'working_day', 'task', 'result', 'comment', 'start_time', 'end_time']


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'  # Or specify: ['id', 'user', 'description', 'type']
        read_only_fields = ['user']  # Set to request.user in views
