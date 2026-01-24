"""
Comprehensive tests for Task API endpoints
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Project, Task, StatusChoices


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
class TestTaskList:
    """Tests for GET /api/tasks/"""
    
    def test_list_tasks_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list tasks"""
        response = api_client.get(reverse('task-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_tasks_as_user_created(self, authenticated_regular_client, regular_user):
        """Test user can see tasks they created in their domain"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        task = Task.objects.create(name='My Task', created_by=regular_user, domain=domain)
        
        response = authenticated_regular_client.get(reverse('task-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        tasks = response.data.get('results', response.data)
        assert len(tasks) == 1
        assert tasks[0]['name'] == 'My Task'
    
    def test_list_tasks_as_user_assigned(self, authenticated_regular_client, regular_user):
        """Test user can see tasks they're assigned to in their domain"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        task = Task.objects.create(name='Assigned Task', domain=domain)
        task.assignees.set([regular_user])
        
        response = authenticated_regular_client.get(reverse('task-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        tasks = response.data.get('results', response.data)
        assert len(tasks) == 1
    
    def test_list_tasks_as_user_project_assigned(self, authenticated_regular_client, regular_user):
        """Test user can see tasks in projects they're assigned to"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        project = Project.objects.create(name='My Project', domain=domain)
        project.assignees.set([regular_user])
        task = Task.objects.create(name='Project Task', project=project, domain=domain)
        
        response = authenticated_regular_client.get(reverse('task-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        tasks = response.data.get('results', response.data)
        assert len(tasks) == 1
    
    def test_list_tasks_as_admin(self, authenticated_admin_client):
        """Test admin can see all tasks"""
        Task.objects.create(name='Task 1')
        Task.objects.create(name='Task 2')
        
        response = authenticated_admin_client.get(reverse('task-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        tasks = response.data.get('results', response.data)
        assert len(tasks) == 2


@pytest.mark.django_db
class TestTaskCreate:
    """Tests for POST /api/tasks/"""
    
    def test_create_task_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot create tasks"""
        data = {'name': 'New Task'}
        response = api_client.post(reverse('task-list'), data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_task_as_user_creates_draft(self, authenticated_regular_client, regular_user):
        """Test regular user creates draft task and is auto-assigned"""
        data = {'name': 'Draft Task', 'description': 'Test description'}
        response = authenticated_regular_client.post(reverse('task-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Draft Task')
        assert task.is_draft is True
        assert task.created_by == regular_user
        assert regular_user in task.assignees.all()
    
    def test_create_task_as_admin_not_draft(self, authenticated_admin_client, admin_user):
        """Test admin creates non-draft task"""
        data = {'name': 'Approved Task', 'is_draft': False}
        response = authenticated_admin_client.post(reverse('task-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Approved Task')
        assert task.is_draft is False
        assert task.created_by == admin_user
    
    def test_create_task_with_project_inherits_assignees(self, authenticated_regular_client, regular_user):
        """Test task with project inherits project assignees"""
        user2 = User.objects.create_user(username='user2', password='pass')
        project = Project.objects.create(name='Test Project')
        project.assignees.set([regular_user, user2])
        
        data = {'name': 'Project Task', 'project_id': project.id}
        response = authenticated_regular_client.post(reverse('task-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Project Task')
        assert task.assignees.count() == 2
        assert regular_user in task.assignees.all()
        assert user2 in task.assignees.all()
    
    def test_create_task_without_project(self, authenticated_regular_client, regular_user):
        """Test creating standalone task without project"""
        data = {'name': 'Standalone Task'}
        response = authenticated_regular_client.post(reverse('task-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Standalone Task')
        assert task.project is None


@pytest.mark.django_db
class TestTaskRetrieve:
    """Tests for GET /api/tasks/{id}/"""
    
    def test_retrieve_task_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot retrieve tasks"""
        task = Task.objects.create(name='Test Task')
        response = api_client.get(reverse('task-detail', kwargs={'pk': task.id}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_retrieve_own_task(self, authenticated_regular_client, regular_user):
        """Test user can retrieve task they created"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        task = Task.objects.create(name='My Task', created_by=regular_user, domain=domain)
        response = authenticated_regular_client.get(reverse('task-detail', kwargs={'pk': task.id}))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'My Task'
        assert 'project' in response.data  # Detail serializer includes project
    
    def test_retrieve_unrelated_task(self, authenticated_regular_client):
        """Test user cannot retrieve unrelated task"""
        task = Task.objects.create(name='Other Task')
        response = authenticated_regular_client.get(reverse('task-detail', kwargs={'pk': task.id}))
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestTaskUpdate:
    """Tests for PATCH/PUT /api/tasks/{id}/"""
    
    def test_update_task_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot update tasks"""
        task = Task.objects.create(name='Test Task')
        data = {'name': 'Updated Task'}
        response = api_client.patch(reverse('task-detail', kwargs={'pk': task.id}), data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_own_task(self, authenticated_regular_client, regular_user):
        """Test user can update task they created"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        task = Task.objects.create(name='My Task', created_by=regular_user, domain=domain)
        data = {'name': 'Updated Task', 'status': StatusChoices.DOING.value}
        response = authenticated_regular_client.patch(reverse('task-detail', kwargs={'pk': task.id}), data)
        
        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.name == 'Updated Task'
        assert task.status == StatusChoices.DOING.value
    
    def test_update_assigned_task(self, authenticated_regular_client, regular_user):
        """Test user can update task they're assigned to"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        task = Task.objects.create(name='Assigned Task', domain=domain)
        task.assignees.set([regular_user])
        data = {'status': StatusChoices.DOING.value}
        response = authenticated_regular_client.patch(reverse('task-detail', kwargs={'pk': task.id}), data)
        
        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.status == StatusChoices.DOING.value


@pytest.mark.django_db
class TestTaskDelete:
    """Tests for DELETE /api/tasks/{id}/"""
    
    def test_delete_task_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot delete tasks"""
        task = Task.objects.create(name='Test Task')
        response = api_client.delete(reverse('task-detail', kwargs={'pk': task.id}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_own_task(self, authenticated_regular_client, regular_user):
        """Test user can delete task they created"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        task = Task.objects.create(name='My Task', created_by=regular_user, domain=domain)
        task_id = task.id
        response = authenticated_regular_client.delete(reverse('task-detail', kwargs={'pk': task.id}))
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Task.objects.filter(id=task_id).exists()

