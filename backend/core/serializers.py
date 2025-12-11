from rest_framework import serializers
from django.contrib.auth.models import User

from .models import Project, Task, WorkingDay, Report, Feedback, ReportResultChoices, StatusChoices


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined']
        read_only_fields = ['date_joined']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'is_staff', 'is_active']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'is_staff', 'is_active']
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ProjectSerializer(serializers.ModelSerializer):
    assignees = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=User.objects.all(),
        required=False
    )
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'color', 'assignees', 'start_date', 
                  'deadline', 'estimated_hours', 'status', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ProjectDetailSerializer(ProjectSerializer):
    assignees = UserSerializer(many=True, read_only=True)


class TaskSerializer(serializers.ModelSerializer):
    project_id = serializers.PrimaryKeyRelatedField(
        source='project',
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )
    assignees = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        required=False
    )
    
    class Meta:
        model = Task
        fields = ['id', 'name', 'description', 'color', 'project_id', 'assignees', 
                  'created_by', 'start_date', 'deadline', 'estimated_hours', 'phase', 
                  'is_draft', 'status', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class TaskDetailSerializer(TaskSerializer):
    project = ProjectSerializer(read_only=True)
    assignees = UserSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    
    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + ['project']


class WorkingDaySerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()

    def get_date(self, obj):
        return obj.check_in.date() if obj.check_in else None

    class Meta:
        model = WorkingDay
        fields = ['id', 'user', 'check_in', 'check_out', 'is_on_leave', 'date']
        read_only_fields = ['user', 'check_in']


class ReportSerializer(serializers.ModelSerializer):
    task_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    task_name = serializers.CharField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Report
        fields = ['id', 'working_day', 'task', 'task_id', 'task_name', 'result', 
                  'comment', 'start_time', 'end_time']
        read_only_fields = ['task']
    
    def create(self, validated_data):
        task_id = validated_data.pop('task_id', None)
        task_name = validated_data.pop('task_name', None)
        working_day = validated_data.get('working_day')
        
        # Auto-create draft task if task doesn't exist
        if task_id:
            try:
                task = Task.objects.get(id=task_id)
            except Task.DoesNotExist:
                task = Task.objects.create(
                    name=task_name or "Draft Task",
                    is_draft=True,
                    created_by=working_day.user
                )
        elif task_name:
            task = Task.objects.create(
                name=task_name,
                is_draft=True,
                created_by=working_day.user
            )
        else:
            raise serializers.ValidationError("Either task_id or task_name must be provided")
        
        validated_data['task'] = task
        report = Report.objects.create(**validated_data)
        
        # Update task status based on report result
        self._update_task_status(task, validated_data['result'])
        
        return report
    
    def update(self, instance, validated_data):
        validated_data.pop('task_id', None)
        validated_data.pop('task_name', None)
        
        result = validated_data.get('result', instance.result)
        
        instance = super().update(instance, validated_data)
        
        # Update task status based on report result
        self._update_task_status(instance.task, result)
        
        return instance
    
    def _update_task_status(self, task, result):
        """Update task status based on report result"""
        status_mapping = {
            ReportResultChoices.SUCCESS.value: StatusChoices.DONE.value,
            ReportResultChoices.ONGOING.value: StatusChoices.DOING.value,
            ReportResultChoices.POSTPONED.value: StatusChoices.POSTPONE.value,
            ReportResultChoices.FAILED.value: StatusChoices.BACKLOG.value,
            ReportResultChoices.CANCELLED.value: StatusChoices.ARCHIVE.value,
        }
        
        new_status = status_mapping.get(result)
        if new_status and task.status != new_status:
            task.status = new_status
            task.save()


class ReportDetailSerializer(ReportSerializer):
    task = TaskDetailSerializer(read_only=True)
    working_day = WorkingDaySerializer(read_only=True)


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['id', 'user', 'description', 'type', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']
