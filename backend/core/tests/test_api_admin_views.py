"""
Comprehensive tests for Admin-only API views
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Project, Task, WorkingDay, Report, Feedback, StatusChoices


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
class TestCurrentUserView:
    """Tests for GET/PATCH /api/current-user/"""
    
    def test_get_current_user_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot access current user"""
        response = api_client.get(reverse('current-user'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_current_user(self, authenticated_regular_client, regular_user):
        """Test getting current user information"""
        response = authenticated_regular_client.get(reverse('current-user'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == regular_user.username
        assert response.data['id'] == regular_user.id
    
    def test_update_current_user(self, authenticated_regular_client, regular_user):
        """Test updating current user information"""
        data = {'first_name': 'Updated', 'last_name': 'Name'}
        response = authenticated_regular_client.patch(reverse('current-user'), data)
        
        assert response.status_code == status.HTTP_200_OK
        regular_user.refresh_from_db()
        assert regular_user.first_name == 'Updated'
        assert regular_user.last_name == 'Name'


@pytest.mark.django_db
class TestStatisticsView:
    """Tests for GET /api/admin/statistics/"""
    
    def test_statistics_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot access statistics"""
        response = api_client.get(reverse('statistics'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_statistics_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot access statistics"""
        response = authenticated_regular_client.get(reverse('statistics'))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_statistics_as_admin(self, authenticated_admin_client, regular_user):
        """Test admin can access statistics"""
        # Create test data
        Project.objects.create(name='Project 1', status=StatusChoices.TODO.value)
        Project.objects.create(name='Project 2', status=StatusChoices.DONE.value)
        Task.objects.create(name='Task 1', is_draft=True)
        Task.objects.create(name='Task 2', is_draft=False, status=StatusChoices.DOING.value)
        WorkingDay.objects.create(user=regular_user)
        Feedback.objects.create(user=regular_user, description='Feedback', type='suggestion')
        
        response = authenticated_admin_client.get(reverse('statistics'))
        
        assert response.status_code == status.HTTP_200_OK
        assert 'users' in response.data
        assert 'projects' in response.data
        assert 'tasks' in response.data
        assert 'working_days' in response.data
        assert 'reports' in response.data
        assert 'feedbacks' in response.data
        assert response.data['projects']['total'] == 2
        assert response.data['tasks']['total'] == 2
        assert response.data['tasks']['drafts'] == 1


@pytest.mark.django_db
class TestOrganizationalDashboardView:
    """Tests for GET /api/admin/organizational-dashboard/"""
    
    def test_dashboard_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot access dashboard"""
        response = api_client.get(reverse('organizational-dashboard'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_dashboard_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot access dashboard"""
        response = authenticated_regular_client.get(reverse('organizational-dashboard'))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_dashboard_as_admin(self, authenticated_admin_client, regular_user):
        """Test admin can access dashboard"""
        project = Project.objects.create(name='Project 1')
        Task.objects.create(name='Task 1', project=project)
        Task.objects.create(name='Task 2', project=project)
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user)
        Report.objects.create(
            working_day=working_day,
            task=task,
            start_time=timezone.now() - timedelta(days=1)
        )
        
        response = authenticated_admin_client.get(reverse('organizational-dashboard'))
        
        assert response.status_code == status.HTTP_200_OK
        assert 'user_activity' in response.data
        assert 'projects' in response.data
        assert 'tasks' in response.data
        assert 'productivity' in response.data
        assert 'recent_tasks' in response.data
        assert 'recent_projects' in response.data


@pytest.mark.django_db
class TestSystemLogsView:
    """Tests for GET /api/admin/system-logs/"""
    
    def test_logs_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot access logs"""
        response = api_client.get(reverse('system-logs'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_logs_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot access logs"""
        response = authenticated_regular_client.get(reverse('system-logs'))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_logs_as_admin(self, authenticated_admin_client, regular_user):
        """Test admin can access logs"""
        task = Task.objects.create(name='Task', created_by=regular_user)
        project = Project.objects.create(name='Project')
        working_day = WorkingDay.objects.create(user=regular_user)
        
        response = authenticated_admin_client.get(reverse('system-logs'))
        
        assert response.status_code == status.HTTP_200_OK
        assert 'logs' in response.data
        assert 'total' in response.data
        assert len(response.data['logs']) > 0


@pytest.mark.django_db
class TestSettingsView:
    """Tests for GET/POST /api/admin/settings/"""
    
    def test_settings_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot access settings"""
        response = api_client.get(reverse('settings'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_settings_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot access settings"""
        response = authenticated_regular_client.get(reverse('settings'))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_settings_as_admin(self, authenticated_admin_client):
        """Test admin can get settings"""
        response = authenticated_admin_client.get(reverse('settings'))
        
        assert response.status_code == status.HTTP_200_OK
        assert 'system_name' in response.data
        assert 'timezone' in response.data
        assert 'max_working_hours_per_day' in response.data
    
    def test_update_settings_as_admin(self, authenticated_admin_client):
        """Test admin can update settings"""
        data = {'max_working_hours_per_day': 10}
        response = authenticated_admin_client.post(reverse('settings'), data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        assert 'settings' in response.data


@pytest.mark.django_db
class TestUserViewSet:
    """Tests for User management (Admin only)"""
    
    def test_list_users_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list users"""
        response = api_client.get(reverse('user-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_users_as_regular_user(self, authenticated_regular_client):
        """Test that regular users cannot list users"""
        response = authenticated_regular_client.get(reverse('user-list'))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_list_users_as_admin(self, authenticated_admin_client):
        """Test admin can list users"""
        User.objects.create_user(username='user1', password='pass')
        User.objects.create_user(username='user2', password='pass')
        
        response = authenticated_admin_client.get(reverse('user-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        users = response.data.get('results', response.data)
        assert len(users) >= 2
    
    def test_create_user_as_admin(self, authenticated_admin_client):
        """Test admin can create users"""
        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'password123',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = authenticated_admin_client.post(reverse('user-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert User.objects.filter(username='newuser').exists()

