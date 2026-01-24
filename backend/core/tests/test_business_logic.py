"""
Tests for business logic and custom actions
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta, date
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import (
    Project, Task, WorkingDay, Report, Feedback,
    StatusChoices, ReportResultChoices, FeedbackTypeChoices
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def regular_user():
    return User.objects.create_user(username='user', password='password', email='user@test.com')


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(username='admin', password='password', email='admin@test.com')


@pytest.fixture
def authenticated_regular_client(api_client, regular_user):
    refresh = RefreshToken.for_user(regular_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def authenticated_admin_client(api_client, admin_user):
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.mark.django_db
class TestTaskAutoAssignment:
    """Tests for automatic task assignment logic"""
    
    def test_regular_user_creates_draft_task_auto_assigned(self, authenticated_regular_client, regular_user):
        """Test that regular user creating task is auto-assigned"""
        data = {'name': 'Draft Task'}
        response = authenticated_regular_client.post(reverse('task-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Draft Task')
        assert task.is_draft is True
        assert regular_user in task.assignees.all()
    
    def test_task_with_project_inherits_assignees(self, authenticated_regular_client, regular_user):
        """Test task inherits assignees from project"""
        user2 = User.objects.create_user(username='user2', password='pass')
        project = Project.objects.create(name='Project')
        project.assignees.set([regular_user, user2])
        
        data = {'name': 'Project Task', 'project_id': project.id}
        response = authenticated_regular_client.post(reverse('task-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Project Task')
        assert task.assignees.count() == 2
        assert regular_user in task.assignees.all()
        assert user2 in task.assignees.all()
    
    def test_admin_creates_non_draft_task(self, authenticated_admin_client, admin_user):
        """Test admin can create non-draft task"""
        data = {'name': 'Approved Task', 'is_draft': False}
        response = authenticated_admin_client.post(reverse('task-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Approved Task')
        assert task.is_draft is False
        assert task.created_by == admin_user


@pytest.mark.django_db
class TestReportTaskStatusUpdate:
    """Tests for report result updating task status"""
    
    def test_report_success_updates_task_to_done(self, authenticated_regular_client, regular_user):
        """Test report with SUCCESS result updates task to DONE"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user, status=StatusChoices.TODO.value)
        
        data = {
            'task_id': task.id,
            'result': ReportResultChoices.SUCCESS.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        task.refresh_from_db()
        assert task.status == StatusChoices.DONE.value
    
    def test_report_ongoing_updates_task_to_doing(self, authenticated_regular_client, regular_user):
        """Test report with ONGOING result updates task to DOING"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user, status=StatusChoices.TODO.value)
        
        data = {
            'task_id': task.id,
            'result': ReportResultChoices.ONGOING.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        task.refresh_from_db()
        assert task.status == StatusChoices.DOING.value
    
    def test_report_postponed_updates_task_to_postpone(self, authenticated_regular_client, regular_user):
        """Test report with POSTPONED result updates task to POSTPONE"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user, status=StatusChoices.DOING.value)
        
        data = {
            'task_id': task.id,
            'result': ReportResultChoices.POSTPONED.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        task.refresh_from_db()
        assert task.status == StatusChoices.POSTPONE.value
    
    def test_report_failed_updates_task_to_backlog(self, authenticated_regular_client, regular_user):
        """Test report with FAILED result updates task to BACKLOG"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user, status=StatusChoices.DOING.value)
        
        data = {
            'task_id': task.id,
            'result': ReportResultChoices.FAILED.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        task.refresh_from_db()
        assert task.status == StatusChoices.BACKLOG.value
    
    def test_report_cancelled_updates_task_to_archive(self, authenticated_regular_client, regular_user):
        """Test report with CANCELLED result updates task to ARCHIVE"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user, status=StatusChoices.DOING.value)
        
        data = {
            'task_id': task.id,
            'result': ReportResultChoices.CANCELLED.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        task.refresh_from_db()
        assert task.status == StatusChoices.ARCHIVE.value
    
    def test_update_report_result_updates_task_status(self, authenticated_regular_client, regular_user):
        """Test updating report result updates task status"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user, status=StatusChoices.TODO.value)
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            result=ReportResultChoices.ONGOING.value
        )
        
        data = {'result': ReportResultChoices.SUCCESS.value}
        response = authenticated_regular_client.patch(
            reverse('working-day-reports-detail', kwargs={
                'working_day_pk': working_day.id,
                'pk': report.id
            }),
            data
        )
        
        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.status == StatusChoices.DONE.value


@pytest.mark.django_db
class TestReportAutoCreateTask:
    """Tests for automatic task creation from report"""
    
    def test_create_report_with_task_name_creates_draft_task(self, authenticated_regular_client, regular_user):
        """Test creating report with task_name auto-creates draft task"""
        working_day = WorkingDay.objects.create(user=regular_user)
        
        data = {
            'task_name': 'New Task from Report',
            'result': ReportResultChoices.ONGOING.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='New Task from Report')
        assert task.is_draft is True
        assert task.created_by == regular_user
    
    def test_create_report_with_nonexistent_task_id_creates_draft_task(self, authenticated_regular_client, regular_user):
        """Test creating report with non-existent task_id creates draft task"""
        working_day = WorkingDay.objects.create(user=regular_user)
        
        data = {
            'task_id': 99999,  # Non-existent
            'task_name': 'Auto-created Task',
            'result': ReportResultChoices.ONGOING.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Auto-created Task')
        assert task.is_draft is True


@pytest.mark.django_db
class TestWorkingDayBusinessLogic:
    """Tests for working day business logic"""
    
    def test_cannot_check_in_with_open_working_day(self, authenticated_regular_client, regular_user):
        """Test cannot check in when already have open working day"""
        WorkingDay.objects.create(user=regular_user, check_out=None, is_on_leave=False)
        
        response = authenticated_regular_client.post(reverse('working-day-list'), {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'check-out' in response.data['detail'].lower() or 'باز' in response.data['detail']
    
    def test_can_check_in_after_checkout(self, authenticated_regular_client, regular_user):
        """Test can check in after previous day is checked out"""
        WorkingDay.objects.create(
            user=regular_user,
            check_out=timezone.now() - timedelta(hours=1)
        )
        
        response = authenticated_regular_client.post(reverse('working-day-list'), {})
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_can_check_in_after_leave_day(self, authenticated_regular_client, regular_user):
        """Test can check in after previous day is marked as leave"""
        WorkingDay.objects.create(
            user=regular_user,
            is_on_leave=True,
            check_out=None
        )
        
        response = authenticated_regular_client.post(reverse('working-day-list'), {})
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_check_out_sets_timestamp(self, authenticated_regular_client, regular_user):
        """Test check-out sets current timestamp"""
        working_day = WorkingDay.objects.create(user=regular_user)
        before_checkout = timezone.now()
        
        response = authenticated_regular_client.post(
            reverse('working-day-check-out', kwargs={'pk': working_day.id})
        )
        
        assert response.status_code == status.HTTP_200_OK
        working_day.refresh_from_db()
        assert working_day.check_out is not None
        assert working_day.check_out >= before_checkout


@pytest.mark.django_db
class TestQuerySetFiltering:
    """Tests for queryset filtering logic"""
    
    def test_regular_user_sees_only_assigned_projects(self, authenticated_regular_client, regular_user):
        """Test regular user only sees assigned projects in their domain"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        assigned_project = Project.objects.create(name='Assigned Project', domain=domain)
        assigned_project.assignees.set([regular_user])
        unassigned_project = Project.objects.create(name='Unassigned Project', domain=domain)
        
        response = authenticated_regular_client.get(reverse('project-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        projects = response.data.get('results', response.data)
        project_names = [p['name'] for p in projects]
        assert 'Assigned Project' in project_names
        assert 'Unassigned Project' not in project_names
    
    def test_regular_user_sees_related_tasks(self, authenticated_regular_client, regular_user):
        """Test regular user sees tasks they created, assigned to, or in assigned projects in their domain"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        # Task created by user
        created_task = Task.objects.create(name='Created Task', created_by=regular_user, domain=domain)
        
        # Task assigned to user
        assigned_task = Task.objects.create(name='Assigned Task', domain=domain)
        assigned_task.assignees.set([regular_user])
        
        # Task in project assigned to user
        project = Project.objects.create(name='Project', domain=domain)
        project.assignees.set([regular_user])
        project_task = Task.objects.create(name='Project Task', project=project, domain=domain)
        
        # Unrelated task in different domain
        other_domain = Domain.objects.create(name='Other Domain')
        unrelated_task = Task.objects.create(name='Unrelated Task', domain=other_domain)
        
        response = authenticated_regular_client.get(reverse('task-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        tasks = response.data.get('results', response.data)
        task_names = [t['name'] for t in tasks]
        assert 'Created Task' in task_names
        assert 'Assigned Task' in task_names
        assert 'Project Task' in task_names
        assert 'Unrelated Task' not in task_names
    
    def test_admin_sees_all_projects(self, authenticated_admin_client, regular_user):
        """Test admin sees all projects"""
        project1 = Project.objects.create(name='Project 1')
        project2 = Project.objects.create(name='Project 2')
        project1.assignees.set([regular_user])
        
        response = authenticated_admin_client.get(reverse('project-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        projects = response.data.get('results', response.data)
        assert len(projects) == 2
    
    def test_regular_user_sees_only_own_working_days(self, authenticated_regular_client, regular_user):
        """Test regular user only sees their own working days"""
        WorkingDay.objects.create(user=regular_user)
        other_user = User.objects.create_user(username='other', password='pass')
        WorkingDay.objects.create(user=other_user)
        
        response = authenticated_regular_client.get(reverse('working-day-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        working_days = response.data.get('results', response.data)
        assert len(working_days) == 1
        assert working_days[0]['user'] == regular_user.id
    
    def test_regular_user_sees_only_own_reports(self, authenticated_regular_client, regular_user):
        """Test regular user only sees their own reports"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user)
        Report.objects.create(working_day=working_day, task=task)
        
        other_user = User.objects.create_user(username='other', password='pass')
        other_working_day = WorkingDay.objects.create(user=other_user)
        other_task = Task.objects.create(name='Other Task', created_by=other_user)
        Report.objects.create(working_day=other_working_day, task=other_task)
        
        response = authenticated_regular_client.get(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id})
        )
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        reports = response.data.get('results', response.data)
        assert len(reports) == 1
