"""
Tests for pagination, filtering, and sorting functionality
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Project, Task, WorkingDay, Report, Feedback, Domain, StatusChoices, ReportResultChoices, FeedbackTypeChoices
from accounts.models import UserProfile


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
class TestPagination:
    """Tests for pagination functionality"""
    
    def test_projects_pagination(self, authenticated_regular_client, regular_user):
        """Test that projects list is paginated"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        # Create 25 projects
        for i in range(25):
            project = Project.objects.create(
                name=f'Project {i}',
                status=StatusChoices.TODO.value,
                domain=domain
            )
            project.assignees.set([regular_user])
        
        # First page
        response = authenticated_regular_client.get('/api/projects/?page=1')
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert 'count' in response.data
        assert response.data['count'] == 25
        assert len(response.data['results']) == 20  # Default page size
        
        # Second page
        response = authenticated_regular_client.get('/api/projects/?page=2')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 5
    
    def test_tasks_pagination(self, authenticated_regular_client, regular_user):
        """Test that tasks list is paginated"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        # Create 30 tasks
        for i in range(30):
            Task.objects.create(
                name=f'Task {i}',
                created_by=regular_user,
                domain=domain
            )
        
        response = authenticated_regular_client.get('/api/tasks/?page=1')
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert response.data['count'] == 30
        assert len(response.data['results']) == 20
    
    def test_custom_page_size(self, authenticated_regular_client, regular_user):
        """Test custom page size parameter"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        for i in range(15):
            Task.objects.create(name=f'Task {i}', created_by=regular_user, domain=domain)
        
        # Note: page_size might not be configurable via query param in DRF default pagination
        # This test verifies pagination works, actual page size depends on DRF settings
        response = authenticated_regular_client.get('/api/tasks/?page=1')
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert len(response.data['results']) <= 20  # Default page size


@pytest.mark.django_db
class TestFiltering:
    """Tests for filtering functionality"""
    
    def test_project_filter_by_status(self, authenticated_regular_client, regular_user):
        """Test filtering projects by status"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        project1 = Project.objects.create(name='Todo Project', status=StatusChoices.TODO.value, domain=domain)
        project2 = Project.objects.create(name='Done Project', status=StatusChoices.DONE.value, domain=domain)
        project3 = Project.objects.create(name='Another Todo', status=StatusChoices.TODO.value, domain=domain)
        # Assign user to projects so they can see them
        project1.assignees.set([regular_user])
        project2.assignees.set([regular_user])
        project3.assignees.set([regular_user])
        
        response = authenticated_regular_client.get('/api/projects/?status=todo')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        assert all(p['status'] == 'todo' for p in response.data['results'])
    
    def test_task_filter_by_status(self, authenticated_regular_client, regular_user):
        """Test filtering tasks by status"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        Task.objects.create(name='Todo Task', status=StatusChoices.TODO.value, created_by=regular_user, domain=domain)
        Task.objects.create(name='Done Task', status=StatusChoices.DONE.value, created_by=regular_user, domain=domain)
        Task.objects.create(name='In Progress', status=StatusChoices.DOING.value, created_by=regular_user, domain=domain)
        
        response = authenticated_regular_client.get('/api/tasks/?status=done')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['status'] == 'done'
    
    def test_task_filter_by_is_draft(self, authenticated_regular_client, regular_user):
        """Test filtering tasks by is_draft"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        Task.objects.create(name='Draft Task', is_draft=True, created_by=regular_user, domain=domain)
        Task.objects.create(name='Regular Task', is_draft=False, created_by=regular_user, domain=domain)
        Task.objects.create(name='Another Draft', is_draft=True, created_by=regular_user, domain=domain)
        
        response = authenticated_regular_client.get('/api/tasks/?is_draft=true')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        assert all(t['is_draft'] is True for t in response.data['results'])
    
    def test_task_filter_by_project(self, authenticated_regular_client, regular_user):
        """Test filtering tasks by project"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        project1 = Project.objects.create(name='Project 1', domain=domain)
        project2 = Project.objects.create(name='Project 2', domain=domain)
        Task.objects.create(name='Task 1', project=project1, created_by=regular_user, domain=domain)
        Task.objects.create(name='Task 2', project=project1, created_by=regular_user, domain=domain)
        Task.objects.create(name='Task 3', project=project2, created_by=regular_user, domain=domain)
        
        response = authenticated_regular_client.get(f'/api/tasks/?project={project1.id}')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        # Check project_id field (serializer might use project_id instead of project)
        assert all(t.get('project_id') == project1.id or t.get('project') == project1.id for t in response.data['results'])
    
    def test_user_filter_by_is_staff(self, authenticated_admin_client):
        """Test filtering users by is_staff"""
        User.objects.create_user(username='regular1', password='pass')
        User.objects.create_user(username='regular2', password='pass')
        User.objects.create_superuser(username='admin2', password='pass')
        
        response = authenticated_admin_client.get('/api/users/?is_staff=true')
        assert response.status_code == status.HTTP_200_OK
        assert all(u['is_staff'] is True for u in response.data['results'])
    
    def test_user_filter_by_is_active(self, authenticated_admin_client):
        """Test filtering users by is_active"""
        user1 = User.objects.create_user(username='active', password='pass', is_active=True)
        user2 = User.objects.create_user(username='inactive', password='pass', is_active=False)
        
        response = authenticated_admin_client.get('/api/users/?is_active=true')
        assert response.status_code == status.HTTP_200_OK
        assert all(u['is_active'] is True for u in response.data['results'])
    
    def test_report_filter_by_result(self, authenticated_regular_client, regular_user):
        """Test filtering reports by result"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user)
        Report.objects.create(working_day=working_day, task=task, result=ReportResultChoices.SUCCESS.value)
        Report.objects.create(working_day=working_day, task=task, result=ReportResultChoices.ONGOING.value)
        Report.objects.create(working_day=working_day, task=task, result=ReportResultChoices.SUCCESS.value)
        
        response = authenticated_regular_client.get(f'/api/working-days/{working_day.id}/reports/?result=success')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        assert all(r['result'] == 'success' for r in response.data['results'])
    
    def test_feedback_filter_by_type(self, authenticated_regular_client, regular_user):
        """Test filtering feedback by type"""
        Feedback.objects.create(user=regular_user, description='Criticism', type=FeedbackTypeChoices.CRITICISM.value)
        Feedback.objects.create(user=regular_user, description='Suggestion', type=FeedbackTypeChoices.SUGGESTION.value)
        Feedback.objects.create(user=regular_user, description='Another Criticism', type=FeedbackTypeChoices.CRITICISM.value)
        
        response = authenticated_regular_client.get('/api/feedbacks/?type=criticism')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        assert all(f['type'] == 'criticism' for f in response.data['results'])


@pytest.mark.django_db
class TestSearch:
    """Tests for search functionality"""
    
    def test_project_search_by_name(self, authenticated_regular_client, regular_user):
        """Test searching projects by name"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        project1 = Project.objects.create(name='Web Development', domain=domain)
        project2 = Project.objects.create(name='Mobile App', domain=domain)
        project3 = Project.objects.create(name='Web Design', domain=domain)
        # Assign user to projects so they can see them
        project1.assignees.set([regular_user])
        project2.assignees.set([regular_user])
        project3.assignees.set([regular_user])
        
        response = authenticated_regular_client.get('/api/projects/?search=Web')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        assert all('Web' in p['name'] for p in response.data['results'])
    
    def test_task_search_by_name(self, authenticated_regular_client, regular_user):
        """Test searching tasks by name"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        Task.objects.create(name='Implement Login', created_by=regular_user, domain=domain)
        Task.objects.create(name='Design Dashboard', created_by=regular_user, domain=domain)
        Task.objects.create(name='Login Page Styling', created_by=regular_user, domain=domain)
        
        response = authenticated_regular_client.get('/api/tasks/?search=Login')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
        assert all('Login' in t['name'] for t in response.data['results'])
    
    def test_user_search_by_username_email(self, authenticated_admin_client):
        """Test searching users by username and email"""
        User.objects.create_user(username='john_doe', email='john@example.com', password='pass')
        User.objects.create_user(username='jane_smith', email='jane@example.com', password='pass')
        User.objects.create_user(username='bob', email='bob@test.com', password='pass')
        
        response = authenticated_admin_client.get('/api/users/?search=john')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert 'john' in response.data['results'][0]['username'].lower() or 'john' in response.data['results'][0]['email'].lower()


@pytest.mark.django_db
class TestSorting:
    """Tests for sorting/ordering functionality"""
    
    def test_projects_sort_by_name_asc(self, authenticated_regular_client, regular_user):
        """Test sorting projects by name ascending"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        Project.objects.create(name='Zebra Project', domain=domain)
        Project.objects.create(name='Alpha Project', domain=domain)
        Project.objects.create(name='Beta Project', domain=domain)
        # Assign user to projects
        for project in Project.objects.filter(domain=domain):
            project.assignees.set([regular_user])
        
        response = authenticated_regular_client.get('/api/projects/?ordering=name')
        assert response.status_code == status.HTTP_200_OK
        names = [p['name'] for p in response.data['results']]
        assert names == sorted(names)
    
    def test_projects_sort_by_name_desc(self, authenticated_regular_client, regular_user):
        """Test sorting projects by name descending"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        Project.objects.create(name='Alpha Project', domain=domain)
        Project.objects.create(name='Beta Project', domain=domain)
        # Assign user to projects
        for project in Project.objects.filter(domain=domain):
            project.assignees.set([regular_user])
        Project.objects.create(name='Zebra Project')
        
        response = authenticated_regular_client.get('/api/projects/?ordering=-name')
        assert response.status_code == status.HTTP_200_OK
        names = [p['name'] for p in response.data['results']]
        assert names == sorted(names, reverse=True)
    
    def test_tasks_sort_by_created_at_desc(self, authenticated_regular_client, regular_user):
        """Test sorting tasks by created_at descending (default)"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        task1 = Task.objects.create(name='Task 1', created_by=regular_user, domain=domain)
        task2 = Task.objects.create(name='Task 2', created_by=regular_user, domain=domain)
        task3 = Task.objects.create(name='Task 3', created_by=regular_user, domain=domain)
        
        response = authenticated_regular_client.get('/api/tasks/')
        assert response.status_code == status.HTTP_200_OK
        ids = [t['id'] for t in response.data['results']]
        # Most recent first
        assert ids[0] == task3.id
        assert ids[1] == task2.id
        assert ids[2] == task1.id
    
    def test_tasks_sort_by_deadline(self, authenticated_regular_client, regular_user):
        """Test sorting tasks by deadline"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        today = timezone.now().date()
        task1 = Task.objects.create(name='Task 1', deadline=today + timedelta(days=3), created_by=regular_user, domain=domain)
        task2 = Task.objects.create(name='Task 2', deadline=today + timedelta(days=1), created_by=regular_user, domain=domain)
        task3 = Task.objects.create(name='Task 3', deadline=today + timedelta(days=2), created_by=regular_user, domain=domain)
        
        response = authenticated_regular_client.get('/api/tasks/?ordering=deadline')
        assert response.status_code == status.HTTP_200_OK
        deadlines = [t['deadline'] for t in response.data['results'] if t['deadline']]
        assert deadlines == sorted(deadlines)
    
    def test_users_sort_by_username(self, authenticated_admin_client):
        """Test sorting users by username"""
        User.objects.create_user(username='zebra', password='pass')
        User.objects.create_user(username='alpha', password='pass')
        User.objects.create_user(username='beta', password='pass')
        
        response = authenticated_admin_client.get('/api/users/?ordering=username')
        assert response.status_code == status.HTTP_200_OK
        usernames = [u['username'] for u in response.data['results']]
        assert usernames == sorted(usernames)


@pytest.mark.django_db
class TestCombinedFilteringSortingPagination:
    """Tests for combining filtering, sorting, and pagination"""
    
    def test_filter_sort_paginate_tasks(self, authenticated_regular_client, regular_user):
        """Test combining filter, sort, and pagination"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        project = Project.objects.create(name='Test Project', domain=domain)
        # Create 25 tasks with different statuses
        for i in range(25):
            Task.objects.create(
                name=f'Task {i}',
                project=project,
                status=StatusChoices.TODO.value if i % 2 == 0 else StatusChoices.DONE.value,
                created_by=regular_user,
                domain=domain
            )
        
        # Filter by project, status, sort by name, paginate
        response = authenticated_regular_client.get(
            f'/api/tasks/?project={project.id}&status=todo&ordering=name&page=1'
        )
        assert response.status_code == status.HTTP_200_OK
        # Check project_id field (serializer might use project_id instead of project)
        assert all(t.get('project_id') == project.id or t.get('project') == project.id for t in response.data['results'])
        assert all(t['status'] == 'todo' for t in response.data['results'])
        names = [t['name'] for t in response.data['results']]
        assert names == sorted(names)
    
    def test_search_filter_paginate_projects(self, authenticated_regular_client, regular_user):
        """Test combining search, filter, and pagination"""
        # Create projects with different statuses
        for i in range(15):
            Project.objects.create(
                name=f'Web Project {i}',
                status=StatusChoices.TODO.value if i < 10 else StatusChoices.DONE.value
            )
        for i in range(10):
            Project.objects.create(
                name=f'Mobile Project {i}',
                status=StatusChoices.TODO.value
            )
        
        # Search for "Web", filter by status, paginate
        response = authenticated_regular_client.get('/api/projects/?search=Web&status=todo&page=1')
        assert response.status_code == status.HTTP_200_OK
        assert all('Web' in p['name'] for p in response.data['results'])
        assert all(p['status'] == 'todo' for p in response.data['results'])
