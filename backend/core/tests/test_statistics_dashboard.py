"""
Comprehensive tests for statistics and dashboard views
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
def authenticated_admin_client(api_client, admin_user):
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.mark.django_db
class TestStatisticsView:
    """Tests for statistics view"""
    
    def test_statistics_empty_database(self, authenticated_admin_client):
        """Test statistics with empty database"""
        response = authenticated_admin_client.get(reverse('statistics'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['users']['total'] == 1  # Only admin user
        assert response.data['projects']['total'] == 0
        assert response.data['tasks']['total'] == 0
        assert response.data['working_days']['total'] == 0
        assert response.data['reports']['total'] == 0
        assert response.data['feedbacks']['total'] == 0
    
    def test_statistics_users_count(self, authenticated_admin_client, regular_user, admin_user):
        """Test user statistics"""
        User.objects.create_user(username='user2', password='pass', is_active=True)
        User.objects.create_user(username='user3', password='pass', is_active=False)
        
        response = authenticated_admin_client.get(reverse('statistics'))
        
        assert response.status_code == status.HTTP_200_OK
        # Total: admin_user (fixture) + regular_user (fixture) + user2 + user3 = 4
        assert response.data['users']['total'] == 4
        # Active: admin_user + regular_user + user2 = 3 (user3 is inactive)
        assert response.data['users']['active'] == 3
        # Admins: admin_user = 1
        assert response.data['users']['admins'] == 1
    
    def test_statistics_projects_count(self, authenticated_admin_client):
        """Test project statistics"""
        Project.objects.create(name='Project 1', status=StatusChoices.TODO.value)
        Project.objects.create(name='Project 2', status=StatusChoices.DOING.value)
        Project.objects.create(name='Project 3', status=StatusChoices.DONE.value)
        Project.objects.create(name='Project 4', status=StatusChoices.BACKLOG.value)
        
        response = authenticated_admin_client.get(reverse('statistics'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['projects']['total'] == 4
        assert response.data['projects']['active'] == 2  # TODO, DOING, TEST
    
    def test_statistics_tasks_count(self, authenticated_admin_client, regular_user):
        """Test task statistics"""
        Task.objects.create(name='Draft Task', is_draft=True, created_by=regular_user)
        Task.objects.create(name='Approved Task', is_draft=False, created_by=regular_user)
        Task.objects.create(name='Task 1', status=StatusChoices.TODO.value, is_draft=False, created_by=regular_user)
        Task.objects.create(name='Task 2', status=StatusChoices.DOING.value, is_draft=False, created_by=regular_user)
        Task.objects.create(name='Task 3', status=StatusChoices.DONE.value, is_draft=False, created_by=regular_user)
        
        response = authenticated_admin_client.get(reverse('statistics'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['tasks']['total'] == 5
        assert response.data['tasks']['drafts'] == 1
        assert response.data['tasks']['by_status']['todo'] == 1
        assert response.data['tasks']['by_status']['doing'] == 1
        assert response.data['tasks']['by_status']['done'] == 1
    
    def test_statistics_working_days_count(self, authenticated_admin_client, regular_user):
        """Test working day statistics"""
        # Create a working day that should match today_check_ins criteria:
        # - check_in date is today (auto-set by auto_now_add=True)
        # - check_out is None (not checked out)
        # - is_on_leave is False
        working_day_today = WorkingDay.objects.create(
            user=regular_user,
            check_out=None,
            is_on_leave=False
        )
        # Verify it was created today
        assert working_day_today.check_in.date() == timezone.now().date()
        
        # Create a working day from yesterday (should not match)
        # We need to manually set check_in since auto_now_add will set it to now
        yesterday = timezone.now() - timedelta(days=1)
        working_day_yesterday = WorkingDay.objects.create(
            user=regular_user,
            check_out=yesterday + timedelta(hours=8),
            is_on_leave=False
        )
        # Manually update check_in to yesterday (since auto_now_add prevents setting during create)
        WorkingDay.objects.filter(id=working_day_yesterday.id).update(check_in=yesterday)
        working_day_yesterday.refresh_from_db()
        
        # Create a working day on leave (should not match)
        working_day_leave = WorkingDay.objects.create(
            user=regular_user,
            check_out=None,
            is_on_leave=True
        )
        
        response = authenticated_admin_client.get(reverse('statistics'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['working_days']['total'] == 3
        # Today check-ins without checkout and not on leave
        # Should be exactly 1 (the first working_day_today)
        assert response.data['working_days']['today_check_ins'] == 1
    
    def test_statistics_reports_count(self, authenticated_admin_client, regular_user):
        """Test report statistics"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user)
        
        # Reports this week
        for i in range(3):
            Report.objects.create(
                working_day=working_day,
                task=task,
                start_time=timezone.now() - timedelta(days=i)
            )
        
        # Reports this month but not this week
        Report.objects.create(
            working_day=working_day,
            task=task,
            start_time=timezone.now() - timedelta(days=10)
        )
        
        # Old report
        Report.objects.create(
            working_day=working_day,
            task=task,
            start_time=timezone.now() - timedelta(days=40)
        )
        
        response = authenticated_admin_client.get(reverse('statistics'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['reports']['total'] == 5
        assert response.data['reports']['this_week'] == 3
        assert response.data['reports']['this_month'] == 4
    
    def test_statistics_feedbacks_count(self, authenticated_admin_client, regular_user):
        """Test feedback statistics"""
        Feedback.objects.create(user=regular_user, description='Suggestion', type=FeedbackTypeChoices.SUGGESTION.value)
        Feedback.objects.create(user=regular_user, description='Criticism', type=FeedbackTypeChoices.CRITICISM.value)
        Feedback.objects.create(user=regular_user, description='Question', type=FeedbackTypeChoices.QUESTION.value)
        Feedback.objects.create(user=regular_user, description='No type')
        
        response = authenticated_admin_client.get(reverse('statistics'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['feedbacks']['total'] == 4
        assert response.data['feedbacks']['by_type']['suggestion'] == 1
        assert response.data['feedbacks']['by_type']['criticism'] == 1
        assert response.data['feedbacks']['by_type']['question'] == 1


@pytest.mark.django_db
class TestOrganizationalDashboardView:
    """Tests for organizational dashboard view"""
    
    def test_dashboard_empty_database(self, authenticated_admin_client):
        """Test dashboard with empty database"""
        response = authenticated_admin_client.get(reverse('organizational-dashboard'))
        
        assert response.status_code == status.HTTP_200_OK
        assert 'user_activity' in response.data
        assert 'projects' in response.data
        assert 'tasks' in response.data
        assert 'productivity' in response.data
        assert 'recent_tasks' in response.data
        assert 'recent_projects' in response.data
    
    def test_dashboard_user_activity(self, authenticated_admin_client, regular_user):
        """Test user activity in dashboard"""
        # Working days this week
        for i in range(3):
            WorkingDay.objects.create(
                user=regular_user,
                check_in=timezone.now() - timedelta(days=i)
            )
        
        # Old working day
        WorkingDay.objects.create(
            user=regular_user,
            check_in=timezone.now() - timedelta(days=10)
        )
        
        response = authenticated_admin_client.get(reverse('organizational-dashboard'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user_activity']['active_users_this_week'] >= 1
    
    def test_dashboard_projects_by_status(self, authenticated_admin_client):
        """Test projects by status in dashboard"""
        for status_choice in StatusChoices:
            Project.objects.create(name=f'Project {status_choice.value}', status=status_choice.value)
        
        response = authenticated_admin_client.get(reverse('organizational-dashboard'))
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['projects']['by_status']) == len(StatusChoices)
    
    def test_dashboard_tasks_by_project(self, authenticated_admin_client, regular_user):
        """Test tasks by project in dashboard"""
        project1 = Project.objects.create(name='Project 1')
        project2 = Project.objects.create(name='Project 2')
        
        for i in range(5):
            Task.objects.create(name=f'Task {i}', project=project1, created_by=regular_user)
        for i in range(3):
            Task.objects.create(name=f'Task {i}', project=project2, created_by=regular_user)
        Task.objects.create(name='Standalone Task', created_by=regular_user)
        
        response = authenticated_admin_client.get(reverse('organizational-dashboard'))
        
        assert response.status_code == status.HTTP_200_OK
        project_counts = {item['project']: item['count'] for item in response.data['tasks']['by_project']}
        assert project_counts.get('Project 1') == 5
        assert project_counts.get('Project 2') == 3
        assert project_counts.get('بدون پروژه') == 1  # Standalone task
    
    def test_dashboard_user_productivity(self, authenticated_admin_client, regular_user):
        """Test user productivity in dashboard"""
        other_user = User.objects.create_user(username='other', password='pass')
        
        # Reports for regular_user this month
        for i in range(5):
            wd = WorkingDay.objects.create(user=regular_user)
            task = Task.objects.create(name=f'Task {i}', created_by=regular_user)
            Report.objects.create(
                working_day=wd,
                task=task,
                start_time=timezone.now() - timedelta(days=i)
            )
        
        # Reports for other_user
        for i in range(2):
            wd = WorkingDay.objects.create(user=other_user)
            task = Task.objects.create(name=f'Task {i}', created_by=other_user)
            Report.objects.create(
                working_day=wd,
                task=task,
                start_time=timezone.now() - timedelta(days=i)
            )
        
        response = authenticated_admin_client.get(reverse('organizational-dashboard'))
        
        assert response.status_code == status.HTTP_200_OK
        productivity = {item['user']: item['reports'] for item in response.data['productivity']}
        assert productivity.get('user') == 5
        assert productivity.get('other') == 2
    
    def test_dashboard_recent_tasks(self, authenticated_admin_client, regular_user):
        """Test recent tasks in dashboard"""
        tasks = []
        for i in range(15):
            task = Task.objects.create(
                name=f'Task {i}',
                created_by=regular_user
            )
            # Update created_at since it's auto_now_add
            Task.objects.filter(id=task.id).update(created_at=timezone.now() - timedelta(hours=i))
            tasks.append(task)
        
        response = authenticated_admin_client.get(reverse('organizational-dashboard'))
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['recent_tasks']) == 10  # Limited to 10
        # Should be ordered by created_at descending (most recent first)
        # Task 0 was created most recently (0 hours ago)
        assert response.data['recent_tasks'][0]['name'] == 'Task 0'
    
    def test_dashboard_recent_projects(self, authenticated_admin_client):
        """Test recent projects in dashboard"""
        projects = []
        for i in range(15):
            project = Project.objects.create(name=f'Project {i}')
            # Update created_at since it's auto_now_add
            Project.objects.filter(id=project.id).update(created_at=timezone.now() - timedelta(hours=i))
            projects.append(project)
        
        response = authenticated_admin_client.get(reverse('organizational-dashboard'))
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['recent_projects']) == 10  # Limited to 10
        # Should be ordered by created_at descending (most recent first)
        assert response.data['recent_projects'][0]['name'] == 'Project 0'


@pytest.mark.django_db
class TestSystemLogsView:
    """Tests for system logs view"""
    
    def test_system_logs_empty(self, authenticated_admin_client):
        """Test system logs with no activity"""
        response = authenticated_admin_client.get(reverse('system-logs'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['logs'] == []
        assert response.data['total'] == 0
    
    def test_system_logs_recent_tasks(self, authenticated_admin_client, regular_user):
        """Test system logs include recent tasks"""
        task = Task.objects.create(
            name='Recent Task',
            created_by=regular_user,
            created_at=timezone.now() - timedelta(days=2)
        )
        
        response = authenticated_admin_client.get(reverse('system-logs'))
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['logs']) > 0
        task_logs = [log for log in response.data['logs'] if log['type'] == 'task_created']
        assert len(task_logs) > 0
        assert any('Recent Task' in log['message'] for log in task_logs)
    
    def test_system_logs_recent_projects(self, authenticated_admin_client):
        """Test system logs include recent projects"""
        project = Project.objects.create(
            name='Recent Project',
            created_at=timezone.now() - timedelta(days=2)
        )
        
        response = authenticated_admin_client.get(reverse('system-logs'))
        
        assert response.status_code == status.HTTP_200_OK
        project_logs = [log for log in response.data['logs'] if log['type'] == 'project_created']
        assert len(project_logs) > 0
        assert any('Recent Project' in log['message'] for log in project_logs)
    
    def test_system_logs_check_ins(self, authenticated_admin_client, regular_user):
        """Test system logs include check-ins"""
        working_day = WorkingDay.objects.create(
            user=regular_user,
            check_in=timezone.now() - timedelta(days=2)
        )
        
        response = authenticated_admin_client.get(reverse('system-logs'))
        
        assert response.status_code == status.HTTP_200_OK
        check_in_logs = [log for log in response.data['logs'] if log['type'] == 'check_in']
        assert len(check_in_logs) > 0
        assert any(regular_user.username in log['message'] for log in check_in_logs)
    
    def test_system_logs_ordered_by_timestamp(self, authenticated_admin_client, regular_user):
        """Test system logs are ordered by timestamp descending"""
        # Create items with different timestamps
        Task.objects.create(name='Old Task', created_by=regular_user, created_at=timezone.now() - timedelta(days=5))
        Task.objects.create(name='New Task', created_by=regular_user, created_at=timezone.now() - timedelta(days=1))
        
        response = authenticated_admin_client.get(reverse('system-logs'))
        
        assert response.status_code == status.HTTP_200_OK
        if len(response.data['logs']) > 1:
            timestamps = [log['timestamp'] for log in response.data['logs']]
            assert timestamps == sorted(timestamps, reverse=True)
    
    def test_system_logs_limit(self, authenticated_admin_client, regular_user):
        """Test system logs are limited to 100"""
        # Create more than 100 items
        for i in range(150):
            Task.objects.create(
                name=f'Task {i}',
                created_by=regular_user,
                created_at=timezone.now() - timedelta(hours=i)
            )
        
        response = authenticated_admin_client.get(reverse('system-logs'))
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['logs']) <= 100


@pytest.mark.django_db
class TestSettingsView:
    """Tests for settings view"""
    
    def test_get_settings(self, authenticated_admin_client):
        """Test getting system settings"""
        response = authenticated_admin_client.get(reverse('settings'))
        
        assert response.status_code == status.HTTP_200_OK
        assert 'system_name' in response.data
        assert 'timezone' in response.data
        assert 'max_working_hours_per_day' in response.data
        assert response.data['timezone'] == 'Asia/Tehran'
    
    def test_update_settings(self, authenticated_admin_client):
        """Test updating system settings"""
        data = {'max_working_hours_per_day': 10}
        response = authenticated_admin_client.post(reverse('settings'), data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        assert 'settings' in response.data
        # request.data returns strings, so convert for comparison
        assert int(response.data['settings']['max_working_hours_per_day']) == 10

