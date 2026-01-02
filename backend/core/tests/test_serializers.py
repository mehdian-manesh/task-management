"""
Comprehensive tests for serializers
"""
import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, date
from rest_framework.test import APIRequestFactory

from core.models import Project, Task, WorkingDay, Report, Feedback, StatusChoices, ReportResultChoices, FeedbackTypeChoices
from core.serializers import (
    ProjectSerializer, ProjectDetailSerializer,
    TaskSerializer, TaskDetailSerializer,
    WorkingDaySerializer,
    ReportSerializer, ReportDetailSerializer,
    FeedbackSerializer,
    UserSerializer, UserCreateSerializer, UserUpdateSerializer
)


@pytest.fixture
def request_factory():
    return APIRequestFactory()


@pytest.fixture
def user():
    return User.objects.create_user(username='user', password='password', email='user@test.com')


@pytest.mark.django_db
class TestProjectSerializer:
    """Tests for Project serializers"""
    
    def test_project_serializer(self, user):
        """Test ProjectSerializer serialization"""
        project = Project.objects.create(
            name='Test Project',
            description='Description',
            color='#FF0000',
            status=StatusChoices.TODO.value
        )
        project.assignees.set([user])
        
        serializer = ProjectSerializer(project)
        data = serializer.data
        
        assert data['name'] == 'Test Project'
        assert data['description'] == 'Description'
        assert data['color'] == '#FF0000'
        assert data['status'] == StatusChoices.TODO.value
        assert user.id in data['assignees']
    
    def test_project_detail_serializer(self, user, request_factory):
        """Test ProjectDetailSerializer includes nested assignees"""
        project = Project.objects.create(name='Test Project')
        project.assignees.set([user])
        
        request = request_factory.get('/')
        serializer = ProjectDetailSerializer(project, context={'request': request})
        data = serializer.data
        
        assert 'assignees' in data
        assert len(data['assignees']) == 1
        assert data['assignees'][0]['username'] == user.username
    
    def test_project_serializer_create(self, user):
        """Test ProjectSerializer deserialization and creation"""
        data = {
            'name': 'New Project',
            'description': 'New description',
            'color': '#00FF00',
            'status': StatusChoices.DOING.value,
            'assignees': [user.id]
        }
        serializer = ProjectSerializer(data=data)
        assert serializer.is_valid()
        
        project = serializer.save()
        assert project.name == 'New Project'
        assert user in project.assignees.all()


@pytest.mark.django_db
class TestTaskSerializer:
    """Tests for Task serializers"""
    
    def test_task_serializer(self, user):
        """Test TaskSerializer serialization"""
        project = Project.objects.create(name='Project')
        task = Task.objects.create(
            name='Test Task',
            description='Description',
            project=project,
            created_by=user,
            status=StatusChoices.DOING.value
        )
        task.assignees.set([user])
        
        serializer = TaskSerializer(task)
        data = serializer.data
        
        assert data['name'] == 'Test Task'
        assert data['project_id'] == project.id
        assert data['created_by'] == user.id
        assert user.id in data['assignees']
    
    def test_task_detail_serializer(self, user, request_factory):
        """Test TaskDetailSerializer includes nested objects"""
        project = Project.objects.create(name='Project')
        task = Task.objects.create(name='Test Task', project=project, created_by=user)
        
        request = request_factory.get('/')
        serializer = TaskDetailSerializer(task, context={'request': request})
        data = serializer.data
        
        assert 'project' in data
        assert 'assignees' in data
        assert 'created_by' in data
        assert data['project']['name'] == 'Project'
    
    def test_task_serializer_create(self, user):
        """Test TaskSerializer deserialization"""
        project = Project.objects.create(name='Project')
        data = {
            'name': 'New Task',
            'project_id': project.id,
            'status': StatusChoices.TODO.value,
            'assignees': [user.id]
        }
        serializer = TaskSerializer(data=data)
        assert serializer.is_valid()


@pytest.mark.django_db
class TestWorkingDaySerializer:
    """Tests for WorkingDaySerializer"""
    
    def test_working_day_serializer(self, user):
        """Test WorkingDaySerializer serialization"""
        working_day = WorkingDay.objects.create(user=user)
        check_out = working_day.check_in + timedelta(hours=8)
        working_day.check_out = check_out
        working_day.save()
        
        serializer = WorkingDaySerializer(working_day)
        data = serializer.data
        
        assert data['user'] == user.id
        assert 'check_in' in data
        assert 'check_out' in data
        assert 'date' in data
        # date should be ISO format string from the actual check_in
        assert data['date'] == working_day.check_in.date().isoformat()
    
    def test_working_day_serializer_read_only_fields(self, user):
        """Test that user and check_in are read-only"""
        working_day = WorkingDay.objects.create(user=user)
        data = {
            'user': User.objects.create_user(username='other', password='p').id,
            'check_in': timezone.now().isoformat()
        }
        serializer = WorkingDaySerializer(working_day, data=data, partial=True)
        assert serializer.is_valid()
        # Read-only fields should not be updated
        serializer.save()
        working_day.refresh_from_db()
        assert working_day.user == user  # Unchanged


@pytest.mark.django_db
class TestReportSerializer:
    """Tests for Report serializers"""
    
    def test_report_serializer(self, user):
        """Test ReportSerializer serialization"""
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task', created_by=user)
        start_time = timezone.now()
        end_time = start_time + timedelta(hours=2)
        
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            result=ReportResultChoices.SUCCESS.value,
            comment='Completed',
            start_time=start_time,
            end_time=end_time
        )
        
        serializer = ReportSerializer(report)
        data = serializer.data
        
        assert data['working_day'] == working_day.id
        # task is now serialized as a full object, not just id
        assert isinstance(data['task'], dict)
        assert data['task']['id'] == task.id
        assert data['task']['name'] == task.name
        assert data['result'] == ReportResultChoices.SUCCESS.value
        assert data['comment'] == 'Completed'
    
    def test_report_serializer_create_with_task_id(self, user):
        """Test ReportSerializer create with existing task_id"""
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task', created_by=user)
        
        data = {
            'working_day': working_day.id,
            'task_id': task.id,
            'result': ReportResultChoices.SUCCESS.value,
            'comment': 'Done'
        }
        serializer = ReportSerializer(data=data)
        assert serializer.is_valid()
        
        report = serializer.save()
        assert report.task == task
        assert report.working_day == working_day
    
    def test_report_serializer_create_with_task_name(self, user):
        """Test ReportSerializer create with task_name (auto-creates task)"""
        working_day = WorkingDay.objects.create(user=user)
        
        data = {
            'working_day': working_day.id,
            'task_name': 'New Task',
            'result': ReportResultChoices.ONGOING.value
        }
        serializer = ReportSerializer(data=data)
        assert serializer.is_valid()
        
        report = serializer.save()
        assert report.task.name == 'New Task'
        assert report.task.is_draft is True
        assert report.task.created_by == user
    
    def test_report_serializer_create_missing_task_info(self, user):
        """Test ReportSerializer create fails without task_id or task_name"""
        working_day = WorkingDay.objects.create(user=user)
        
        data = {
            'working_day': working_day.id,
            'result': ReportResultChoices.SUCCESS.value
        }
        serializer = ReportSerializer(data=data)
        assert serializer.is_valid()  # Validation passes
        # But create() should raise ValidationError
        from rest_framework.exceptions import ValidationError
        with pytest.raises(ValidationError):
            serializer.save()
    
    def test_report_serializer_update_task_status(self, user):
        """Test that report update changes task status"""
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task', created_by=user, status=StatusChoices.TODO.value)
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            result=ReportResultChoices.ONGOING.value
        )
        
        data = {'result': ReportResultChoices.SUCCESS.value}
        serializer = ReportSerializer(report, data=data, partial=True)
        assert serializer.is_valid()
        serializer.save()
        
        task.refresh_from_db()
        assert task.status == StatusChoices.DONE.value
    
    def test_report_detail_serializer(self, user, request_factory):
        """Test ReportDetailSerializer includes nested objects"""
        working_day = WorkingDay.objects.create(user=user)
        task = Task.objects.create(name='Task', created_by=user)
        report = Report.objects.create(working_day=working_day, task=task)
        
        request = request_factory.get('/')
        serializer = ReportDetailSerializer(report, context={'request': request})
        data = serializer.data
        
        assert 'task' in data
        assert 'working_day' in data
        assert isinstance(data['task'], dict)
        assert isinstance(data['working_day'], dict)


@pytest.mark.django_db
class TestFeedbackSerializer:
    """Tests for FeedbackSerializer"""
    
    def test_feedback_serializer(self, user):
        """Test FeedbackSerializer serialization"""
        feedback = Feedback.objects.create(
            user=user,
            description='Test feedback',
            type=FeedbackTypeChoices.SUGGESTION.value
        )
        
        serializer = FeedbackSerializer(feedback)
        data = serializer.data
        
        assert data['user'] == user.id
        assert data['description'] == 'Test feedback'
        assert data['type'] == FeedbackTypeChoices.SUGGESTION.value
        assert 'created_at' in data
        assert 'updated_at' in data
    
    def test_feedback_serializer_create(self, user):
        """Test FeedbackSerializer deserialization"""
        data = {
            'description': 'New feedback',
            'type': FeedbackTypeChoices.QUESTION.value
        }
        serializer = FeedbackSerializer(data=data)
        assert serializer.is_valid()
        
        feedback = serializer.save(user=user)
        assert feedback.description == 'New feedback'
        assert feedback.type == FeedbackTypeChoices.QUESTION.value
        assert feedback.user == user


@pytest.mark.django_db
class TestUserSerializer:
    """Tests for User serializers"""
    
    def test_user_serializer(self, user, request_factory):
        """Test UserSerializer serialization"""
        request = request_factory.get('/')
        serializer = UserSerializer(user, context={'request': request})
        data = serializer.data
        
        assert data['id'] == user.id
        assert data['username'] == user.username
        assert data['email'] == user.email
        assert 'profile_picture' in data
    
    def test_user_create_serializer(self):
        """Test UserCreateSerializer creates user with password"""
        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'password123',
            'first_name': 'New',
            'last_name': 'User'
        }
        serializer = UserCreateSerializer(data=data)
        assert serializer.is_valid()
        
        user = serializer.save()
        assert user.username == 'newuser'
        assert user.check_password('password123')
    
    def test_user_update_serializer(self, user):
        """Test UserUpdateSerializer updates user"""
        data = {
            'first_name': 'Updated',
            'last_name': 'Name'
        }
        serializer = UserUpdateSerializer(user, data=data, partial=True)
        assert serializer.is_valid()
        
        updated_user = serializer.save()
        assert updated_user.first_name == 'Updated'
        assert updated_user.last_name == 'Name'
    
    def test_user_update_serializer_password(self, user):
        """Test UserUpdateSerializer updates password"""
        old_password_hash = user.password
        data = {'password': 'newpassword123'}
        serializer = UserUpdateSerializer(user, data=data, partial=True)
        assert serializer.is_valid()
        
        updated_user = serializer.save()
        assert updated_user.password != old_password_hash
        assert updated_user.check_password('newpassword123')

