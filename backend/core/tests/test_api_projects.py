"""
Comprehensive tests for Project API endpoints
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Project, StatusChoices


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
class TestProjectList:
    """Tests for GET /api/projects/"""
    
    def test_list_projects_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list projects"""
        response = api_client.get(reverse('project-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_projects_as_regular_user(self, authenticated_regular_client, regular_user):
        """Test regular user can list only assigned projects in their domain"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        # Create projects
        project1 = Project.objects.create(name='Assigned Project', domain=domain)
        project1.assignees.set([regular_user])
        project2 = Project.objects.create(name='Unassigned Project', domain=domain)
        # Project in different domain - should not be visible
        other_domain = Domain.objects.create(name='Other Domain')
        project3 = Project.objects.create(name='Other Domain Project', domain=other_domain)
        
        response = authenticated_regular_client.get(reverse('project-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        projects = response.data.get('results', response.data)
        # User should see both projects in their domain (assigned or not, but in domain)
        # But domain filtering happens after assignee filtering, so only assigned projects
        project_names = [p['name'] for p in projects]
        assert 'Assigned Project' in project_names
        assert 'Unassigned Project' not in project_names  # Not assigned
        assert 'Other Domain Project' not in project_names  # Different domain
    
    def test_list_projects_as_admin(self, authenticated_admin_client, regular_user):
        """Test admin can list all projects"""
        project1 = Project.objects.create(name='Project 1')
        project2 = Project.objects.create(name='Project 2')
        project1.assignees.set([regular_user])
        
        response = authenticated_admin_client.get(reverse('project-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        projects = response.data.get('results', response.data)
        assert len(projects) == 2
    
    def test_list_projects_empty(self, authenticated_regular_client):
        """Test listing projects when none exist"""
        response = authenticated_regular_client.get(reverse('project-list'))
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        projects = response.data.get('results', response.data)
        assert len(projects) == 0


@pytest.mark.django_db
class TestProjectCreate:
    """Tests for POST /api/projects/"""
    
    def test_create_project_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot create projects"""
        data = {'name': 'New Project'}
        response = api_client.post(reverse('project-list'), data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_project_as_regular_user(self, authenticated_regular_client):
        """Test regular user cannot create projects"""
        data = {
            'name': 'New Project',
            'description': 'Test description',
            'status': StatusChoices.TODO.value
        }
        response = authenticated_regular_client.post(reverse('project-list'), data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_create_project_as_admin(self, authenticated_admin_client):
        """Test admin can create projects"""
        data = {
            'name': 'New Project',
            'description': 'Test description',
            'color': '#FF0000',
            'status': StatusChoices.TODO.value,
            'estimated_hours': 100
        }
        response = authenticated_admin_client.post(reverse('project-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Project'
        assert response.data['description'] == 'Test description'
        assert Project.objects.filter(name='New Project').exists()
    
    def test_create_project_with_assignees(self, authenticated_admin_client, regular_user):
        """Test creating project with assignees"""
        user2 = User.objects.create_user(username='user2', password='pass')
        data = {
            'name': 'Project with Assignees',
            'assignees': [regular_user.id, user2.id]
        }
        response = authenticated_admin_client.post(reverse('project-list'), data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        project = Project.objects.get(name='Project with Assignees')
        assert project.assignees.count() == 2
    
    def test_create_project_minimal_data(self, authenticated_admin_client):
        """Test creating project with only required fields"""
        data = {'name': 'Minimal Project'}
        response = authenticated_admin_client.post(reverse('project-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        project = Project.objects.get(name='Minimal Project')
        assert project.status == StatusChoices.BACKLOG.value  # Default status


@pytest.mark.django_db
class TestProjectRetrieve:
    """Tests for GET /api/projects/{id}/"""
    
    def test_retrieve_project_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot retrieve projects"""
        project = Project.objects.create(name='Test Project')
        response = api_client.get(reverse('project-detail', kwargs={'pk': project.id}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_retrieve_assigned_project_as_user(self, authenticated_regular_client, regular_user):
        """Test regular user can retrieve assigned project"""
        from accounts.models import UserProfile
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        project = Project.objects.create(name='Assigned Project', domain=domain)
        project.assignees.set([regular_user])
        
        response = authenticated_regular_client.get(reverse('project-detail', kwargs={'pk': project.id}))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Assigned Project'
        assert 'assignees' in response.data  # Detail serializer includes assignees
    
    def test_retrieve_unassigned_project_as_user(self, authenticated_regular_client):
        """Test regular user cannot retrieve unassigned project"""
        project = Project.objects.create(name='Unassigned Project')
        response = authenticated_regular_client.get(reverse('project-detail', kwargs={'pk': project.id}))
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_retrieve_project_as_admin(self, authenticated_admin_client):
        """Test admin can retrieve any project"""
        project = Project.objects.create(name='Test Project')
        response = authenticated_admin_client.get(reverse('project-detail', kwargs={'pk': project.id}))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Test Project'
    
    def test_retrieve_nonexistent_project(self, authenticated_admin_client):
        """Test retrieving non-existent project"""
        response = authenticated_admin_client.get(reverse('project-detail', kwargs={'pk': 99999}))
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestProjectUpdate:
    """Tests for PATCH/PUT /api/projects/{id}/"""
    
    def test_update_project_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot update projects"""
        project = Project.objects.create(name='Test Project')
        data = {'name': 'Updated Project'}
        response = api_client.patch(reverse('project-detail', kwargs={'pk': project.id}), data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_project_as_regular_user(self, authenticated_regular_client, regular_user):
        """Test regular user cannot update projects"""
        project = Project.objects.create(name='Test Project')
        project.assignees.set([regular_user])
        data = {'name': 'Updated Project'}
        response = authenticated_regular_client.patch(reverse('project-detail', kwargs={'pk': project.id}), data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_update_project_as_admin(self, authenticated_admin_client):
        """Test admin can update projects"""
        project = Project.objects.create(name='Original Project')
        data = {'name': 'Updated Project', 'status': StatusChoices.DOING.value}
        response = authenticated_admin_client.patch(reverse('project-detail', kwargs={'pk': project.id}), data)
        
        assert response.status_code == status.HTTP_200_OK
        project.refresh_from_db()
        assert project.name == 'Updated Project'
        assert project.status == StatusChoices.DOING.value
    
    def test_partial_update_project(self, authenticated_admin_client):
        """Test partial update of project"""
        project = Project.objects.create(name='Original Project', estimated_hours=50)
        data = {'estimated_hours': 100}
        response = authenticated_admin_client.patch(reverse('project-detail', kwargs={'pk': project.id}), data)
        
        assert response.status_code == status.HTTP_200_OK
        project.refresh_from_db()
        assert project.name == 'Original Project'  # Unchanged
        assert project.estimated_hours == 100  # Updated


@pytest.mark.django_db
class TestProjectDelete:
    """Tests for DELETE /api/projects/{id}/"""
    
    def test_delete_project_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot delete projects"""
        project = Project.objects.create(name='Test Project')
        response = api_client.delete(reverse('project-detail', kwargs={'pk': project.id}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_project_as_regular_user(self, authenticated_regular_client, regular_user):
        """Test regular user cannot delete projects"""
        project = Project.objects.create(name='Test Project')
        project.assignees.set([regular_user])
        response = authenticated_regular_client.delete(reverse('project-detail', kwargs={'pk': project.id}))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_delete_project_as_admin(self, authenticated_admin_client):
        """Test admin can delete projects"""
        project = Project.objects.create(name='Test Project')
        project_id = project.id
        response = authenticated_admin_client.delete(reverse('project-detail', kwargs={'pk': project.id}))
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Project.objects.filter(id=project_id).exists()

