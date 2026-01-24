"""
Test for task update with project assignment
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from core.models import Task, Project, StatusChoices
from accounts.models import UserProfile
from django.contrib.auth.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def regular_user():
    return User.objects.create_user(username='user', password='password', email='user@test.com')


@pytest.fixture
def authenticated_regular_client(api_client, regular_user):
    refresh = RefreshToken.for_user(regular_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.mark.django_db
class TestTaskUpdateWithProject:
    """Test updating a task with project assignment"""
    
    def test_update_task_add_project(self, authenticated_regular_client, regular_user):
        """Test updating a task to add a project"""
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        # Create a task without a project
        task = Task.objects.create(name='My Task', created_by=regular_user, domain=domain)
        
        # Create a project
        project = Project.objects.create(name='Test Project', domain=domain)
        
        # Update task to add project
        data = {'project_id': project.id}
        response = authenticated_regular_client.patch(
            reverse('task-detail', kwargs={'pk': task.id}),
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK, f"Expected 200, got {response.status_code}. Response: {response.data}"
        task.refresh_from_db()
        assert task.project == project
    
    def test_update_task_remove_project(self, authenticated_regular_client, regular_user):
        """Test updating a task to remove a project (set to empty string)"""
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        # Create a project
        project = Project.objects.create(name='Test Project', domain=domain)
        
        # Create a task with a project
        task = Task.objects.create(
            name='My Task',
            created_by=regular_user,
            domain=domain,
            project=project
        )
        
        # Update task to remove project (send empty string)
        data = {'project_id': ''}
        response = authenticated_regular_client.patch(
            reverse('task-detail', kwargs={'pk': task.id}),
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK, f"Expected 200, got {response.status_code}. Response: {response.data}"
        task.refresh_from_db()
        assert task.project is None
    
    def test_update_task_set_project_to_null(self, authenticated_regular_client, regular_user):
        """Test updating a task to set project to null explicitly"""
        from core.models import Domain
        
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        # Create a project
        project = Project.objects.create(name='Test Project', domain=domain)
        
        # Create a task with a project
        task = Task.objects.create(
            name='My Task',
            created_by=regular_user,
            domain=domain,
            project=project
        )
        
        # Update task to remove project (send null)
        data = {'project_id': None}
        response = authenticated_regular_client.patch(
            reverse('task-detail', kwargs={'pk': task.id}),
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK, f"Expected 200, got {response.status_code}. Response: {response.data}"
        task.refresh_from_db()
        assert task.project is None

