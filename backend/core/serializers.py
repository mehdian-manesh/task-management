from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings

from .models import Project, Task, WorkingDay, Report, Feedback, ReportResultChoices, StatusChoices


class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'profile_picture']
        read_only_fields = ['date_joined']
    
    def get_profile_picture(self, obj):
        """Return the profile picture URL if it exists"""
        try:
            profile = obj.profile
            if profile.profile_picture:
                request = self.context.get('request')
                if request:
                    url = request.build_absolute_uri(profile.profile_picture.url)
                    # Ensure HTTPS if request is HTTPS (fix for proxy scenarios)
                    if request.is_secure() and url.startswith('http://'):
                        url = url.replace('http://', 'https://')
                    return url
                return profile.profile_picture.url
        except AttributeError:
            # Profile doesn't exist yet (shouldn't happen due to signal, but handle gracefully)
            # Django's OneToOne reverse accessor raises AttributeError if related object doesn't exist
            pass
        return None


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
    profile_picture = serializers.ImageField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'is_staff', 'is_active', 'profile_picture']
        read_only_fields = ['is_staff', 'is_active']  # Regular users can't change these
    
    def validate_profile_picture(self, value):
        """Validate and sanitize the profile picture"""
        if value is None:
            return value
        
        from accounts.utils import process_profile_picture
        
        try:
            # Process and sanitize the image
            processed_file = process_profile_picture(value)
            return processed_file
        except Exception as e:
            raise serializers.ValidationError(str(e))
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        profile_picture = validated_data.pop('profile_picture', None)
        
        # Remove is_staff and is_active if present (only admins can change these)
        validated_data.pop('is_staff', None)
        validated_data.pop('is_active', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        
        # Handle profile picture update
        if profile_picture is not None:
            import os
            from django.conf import settings
            
            # Ensure media directory exists
            media_root = settings.MEDIA_ROOT
            if not os.path.exists(media_root):
                os.makedirs(media_root, exist_ok=True)
            profile_pictures_dir = os.path.join(media_root, 'profile_pictures')
            if not os.path.exists(profile_pictures_dir):
                os.makedirs(profile_pictures_dir, exist_ok=True)
            
            # Get or create user profile
            from accounts.models import UserProfile
            try:
                profile, created = UserProfile.objects.get_or_create(user=instance)
                
                # Store old picture path for deletion AFTER new one is saved
                old_picture_path = None
                if profile.profile_picture:
                    try:
                        old_picture_path = profile.profile_picture.path
                    except:
                        old_picture_path = None
                
                # Save new profile picture
                # Ensure file pointer is at beginning
                if hasattr(profile_picture, 'seek'):
                    profile_picture.seek(0)
                
                profile.profile_picture = profile_picture
                profile.save()
                
                # Refresh from database to get the actual file path
                profile.refresh_from_db()
                
                # Get the new file path
                actual_path = None
                try:
                    actual_path = profile.profile_picture.path if profile.profile_picture else None
                except:
                    actual_path = None
                
                # Delete old picture file AFTER new one is saved (to avoid conflicts)
                if old_picture_path and old_picture_path != actual_path:
                    try:
                        if os.path.exists(old_picture_path):
                            os.remove(old_picture_path)
                    except Exception as del_err:
                        import sys
                        print(f"Error deleting old picture: {del_err}", file=sys.stderr)
            except Exception as e:
                raise
        
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
