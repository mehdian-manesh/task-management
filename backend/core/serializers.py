from rest_framework import serializers
from django.contrib.auth.models import User
from django.conf import settings

from .models import Project, Task, WorkingDay, Report, Feedback, Domain, Meeting, MeetingExternalParticipant, ReportResultChoices, StatusChoices, MeetingTypeChoices, RecurrenceTypeChoices, ReportNote, SavedReport


class DomainSerializer(serializers.ModelSerializer):
    """Serializer for Domain model"""
    children_count = serializers.SerializerMethodField()
    projects_count = serializers.SerializerMethodField()
    tasks_count = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Domain
        fields = ['id', 'name', 'path', 'parent', 'children_count', 'projects_count', 'tasks_count', 'users_count', 'created_at', 'updated_at']
        read_only_fields = ['path', 'created_at', 'updated_at']
    
    def get_children_count(self, obj):
        return obj.children.count()
    
    def get_projects_count(self, obj):
        return obj.projects.count()
    
    def get_tasks_count(self, obj):
        return obj.tasks.count()
    
    def get_users_count(self, obj):
        return obj.users.count()


class DomainTreeSerializer(serializers.ModelSerializer):
    """Serializer for Domain tree structure with nested children"""
    children = serializers.SerializerMethodField()
    projects_count = serializers.SerializerMethodField()
    tasks_count = serializers.SerializerMethodField()
    users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Domain
        fields = ['id', 'name', 'path', 'parent', 'children', 'projects_count', 'tasks_count', 'users_count', 'created_at', 'updated_at']
        read_only_fields = ['path', 'created_at', 'updated_at']
    
    def get_children(self, obj):
        """Recursively serialize children"""
        children = obj.children.all()
        return DomainTreeSerializer(children, many=True, context=self.context).data
    
    def get_projects_count(self, obj):
        return obj.projects.count()
    
    def get_tasks_count(self, obj):
        return obj.tasks.count()
    
    def get_users_count(self, obj):
        return obj.users.count()


class UserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    domain = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'profile_picture', 'domain']
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
    
    def get_domain(self, obj):
        """Return the domain ID if it exists"""
        try:
            profile = obj.profile
            if profile.domain:
                return profile.domain.id
        except AttributeError:
            pass
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    domain_id = serializers.PrimaryKeyRelatedField(
        source='profile.domain',
        queryset=Domain.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'is_staff', 'is_active', 'domain_id']
    
    def create(self, validated_data):
        domain_id = validated_data.pop('domain_id', None)
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Set domain in user profile
        from accounts.models import UserProfile
        profile, created = UserProfile.objects.get_or_create(user=user)
        if domain_id:
            profile.domain = domain_id
            profile.save()
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    profile_picture = serializers.ImageField(write_only=True, required=False, allow_null=True)
    domain_id = serializers.PrimaryKeyRelatedField(
        source='profile.domain',
        queryset=Domain.objects.all(),
        required=False,
        allow_null=True
    )
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'is_staff', 'is_active', 'profile_picture', 'domain_id']
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
        domain_id = validated_data.pop('domain_id', None)
        
        # Remove is_staff and is_active if present (only admins can change these)
        validated_data.pop('is_staff', None)
        validated_data.pop('is_active', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        
        # Get or create user profile
        from accounts.models import UserProfile
        profile, created = UserProfile.objects.get_or_create(user=instance)
        
        # Handle domain update
        if 'domain_id' in self.initial_data:
            if domain_id is None:
                profile.domain = None
            else:
                profile.domain = domain_id
            profile.save()
        
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
    domain_id = serializers.PrimaryKeyRelatedField(
        source='domain',
        queryset=Domain.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'color', 'domain_id', 'assignees', 'start_date',
                  'deadline', 'estimated_hours', 'status', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class ProjectDetailSerializer(ProjectSerializer):
    assignees = UserSerializer(many=True, read_only=True)


class NullablePrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    """PrimaryKeyRelatedField that converts empty strings to None"""

    def to_internal_value(self, data):
        if data == '' or data is None:
            return None
        return super().to_internal_value(data)


class TaskSerializer(serializers.ModelSerializer):
    project_id = NullablePrimaryKeyRelatedField(
        source='project',
        queryset=Project.objects.all(),
        required=False,
        allow_null=True
    )
    domain_id = NullablePrimaryKeyRelatedField(
        source='domain',
        queryset=Domain.objects.all(),
        required=False,
        allow_null=True
    )
    assignees = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        required=False
    )

    def validate(self, attrs):
        """Validate task data"""
        return super().validate(attrs)

    def is_valid(self, raise_exception=False):
        """Override to log validation errors"""
        return super().is_valid(raise_exception=raise_exception)

    class Meta:
        model = Task
        fields = ['id', 'name', 'description', 'color', 'project_id', 'domain_id', 'assignees',
                  'created_by', 'start_date', 'deadline', 'estimated_hours', 'phase',
                  'is_draft', 'status', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class TaskDetailSerializer(TaskSerializer):
    project = ProjectSerializer(read_only=True)
    domain = DomainSerializer(read_only=True)
    assignees = UserSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    
    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + ['project', 'domain']


class WorkingDaySerializer(serializers.ModelSerializer):
    date = serializers.SerializerMethodField()

    def get_date(self, obj):
        # obj can be a WorkingDay instance or a dict (during create)
        if isinstance(obj, dict):
            check_in = obj.get('check_in')
            if check_in:
                if hasattr(check_in, 'date'):
                    return check_in.date().isoformat()
                # If it's a string, try to parse it
                from django.utils.dateparse import parse_datetime
                parsed = parse_datetime(str(check_in))
                if parsed:
                    return parsed.date().isoformat()
            return None
        if obj.check_in:
            return obj.check_in.date().isoformat()
        return None

    class Meta:
        model = WorkingDay
        fields = ['id', 'user', 'check_in', 'check_out', 'is_on_leave', 'date']
        read_only_fields = ['user', 'check_in']


class ReportSerializer(serializers.ModelSerializer):
    task_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    task_name = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)
    task = TaskSerializer(read_only=True)
    
    class Meta:
        model = Report
        fields = ['id', 'working_day', 'task', 'task_id', 'task_name', 'result', 
                  'comment', 'start_time', 'end_time']
        read_only_fields = ['task']
    
    def validate_task_id(self, value):
        """Convert empty string to None"""
        if value == '':
            return None
        return value
    
    def validate_task_name(self, value):
        """Convert empty string to None and strip whitespace"""
        if value == '' or (value and not value.strip()):
            return None
        return value.strip() if value else None
    
    def create(self, validated_data):
        task_id = validated_data.pop('task_id', None)
        task_name = validated_data.pop('task_name', None)
        working_day = validated_data.get('working_day')
        
        # Handle empty strings as None
        if task_id == '' or task_id is None:
            task_id = None
        if task_name == '' or (task_name and not task_name.strip()):
            task_name = None
        
        # Auto-create draft task if task doesn't exist
        if task_id:
            try:
                task = Task.objects.get(id=task_id)
            except Task.DoesNotExist:
                # If task_id doesn't exist and task_name is provided, create new task
                if task_name:
                    task = Task.objects.create(
                        name=task_name.strip(),
                        is_draft=True,
                        created_by=working_day.user
                    )
                else:
                    raise serializers.ValidationError({
                        'task_id': ['وظیفه با این شناسه یافت نشد.'],
                        'task_name': ['لطفاً عنوان وظیفه جدید را وارد کنید.']
                    })
        elif task_name:
            task = Task.objects.create(
                name=task_name.strip(),
                is_draft=True,
                created_by=working_day.user
            )
        else:
            raise serializers.ValidationError({
                'non_field_errors': ['لطفاً یک وظیفه انتخاب کنید یا عنوان وظیفه جدید را وارد کنید.']
            })
        
        validated_data['task'] = task
        result = validated_data.get('result', ReportResultChoices.ONGOING.value)
        report = Report.objects.create(**validated_data)
        
        # Update task status based on report result
        self._update_task_status(task, result)
        
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


class MeetingExternalParticipantSerializer(serializers.ModelSerializer):
    """Serializer for external meeting participants"""
    class Meta:
        model = MeetingExternalParticipant
        fields = ['id', 'name']


class MeetingSerializer(serializers.ModelSerializer):
    """Serializer for Meeting model"""
    participants = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all(), required=False)
    external_participants = serializers.ListField(
        child=serializers.CharField(max_length=255),
        required=False,
        allow_empty=True,
        write_only=True
    )
    external_participants_list = MeetingExternalParticipantSerializer(many=True, read_only=True, source='external_participants')
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    is_future = serializers.SerializerMethodField()
    next_occurrences = serializers.SerializerMethodField()
    
    class Meta:
        model = Meeting
        fields = [
            'id', 'datetime', 'type', 'topic', 'location', 'summary',
            'recurrence_type', 'recurrence_end_date', 'recurrence_count', 'recurrence_interval',
            'google_calendar_event_id', 'google_calendar_synced',
            'participants', 'external_participants', 'external_participants_list',
            'created_by', 'created_by_username', 'created_at', 'updated_at',
            'is_future', 'next_occurrences'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'google_calendar_synced']
        extra_kwargs = {
            'datetime': {'required': True},
            'type': {'required': True},
            'topic': {'required': True}
        }
    
    def get_is_future(self, obj):
        """Check if meeting is in the future"""
        return obj.is_future()
    
    def get_next_occurrences(self, obj):
        """Get next 3 occurrences"""
        occurrences = obj.get_next_occurrences(count=3)
        return [occ.isoformat() for occ in occurrences]
    
    def create(self, validated_data):
        external_participants = validated_data.pop('external_participants', [])
        participants = validated_data.pop('participants', [])
        
        # Set created_by from request user
        validated_data['created_by'] = self.context['request'].user
        
        meeting = Meeting.objects.create(**validated_data)
        
        # Add app user participants
        if participants:
            meeting.participants.set(participants)
        
        # Add external participants
        for name in external_participants:
            if name and name.strip():  # Only add non-empty names
                MeetingExternalParticipant.objects.get_or_create(
                    meeting=meeting,
                    name=name.strip()
                )
        
        return meeting
    
    def update(self, instance, validated_data):
        external_participants = validated_data.pop('external_participants', None)
        participants = validated_data.pop('participants', None)
        
        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update app user participants if provided
        if participants is not None:
            instance.participants.set(participants)
        
        # Update external participants if provided
        if external_participants is not None:
            # Remove existing external participants
            instance.external_participants.all().delete()
            # Add new ones
            for name in external_participants:
                if name and name.strip():
                    MeetingExternalParticipant.objects.get_or_create(
                        meeting=instance,
                        name=name.strip()
                    )
        
        return instance


class MeetingDetailSerializer(MeetingSerializer):
    """Detailed serializer for Meeting with full participant information"""
    participants_details = serializers.SerializerMethodField()
    
    class Meta(MeetingSerializer.Meta):
        fields = MeetingSerializer.Meta.fields + ['participants_details']
    
    def get_participants_details(self, obj):
        """Return detailed information about app user participants"""
        return [
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
            for user in obj.participants.all()
        ]


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ['id', 'user', 'description', 'type', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']


class ReportNoteSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    domain_name = serializers.CharField(source='domain.name', read_only=True, allow_null=True)
    
    class Meta:
        model = ReportNote
        fields = ['id', 'period_type', 'jalali_year', 'jalali_month', 'jalali_day', 'jalali_week',
                  'domain', 'domain_name', 'note', 'created_by', 'created_by_username', 'created_at', 'updated_at']
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class SavedReportSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    domain_name = serializers.CharField(source='domain.name', read_only=True, allow_null=True)
    pdf_file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SavedReport
        fields = ['id', 'report_type', 'period_type', 'jalali_year', 'jalali_month', 'jalali_week',
                  'user', 'user_username', 'domain', 'domain_name', 'report_data', 'pdf_file', 'pdf_file_url', 'created_at']
        read_only_fields = ['created_at']
    
    def get_pdf_file_url(self, obj):
        """Return the PDF file URL if it exists"""
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                url = request.build_absolute_uri(obj.pdf_file.url)
                # Ensure HTTPS if request is HTTPS
                if request.is_secure() and url.startswith('http://'):
                    url = url.replace('http://', 'https://')
                return url
            return obj.pdf_file.url
        return None
