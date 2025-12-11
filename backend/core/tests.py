import pytest
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth.models import User
from core.models import *
from core.serializers import *
from rest_framework_simplejwt.tokens import RefreshToken


@pytest.fixture
def user():
    return User.objects.create_user(username='testuser', password='testpass')

@pytest.mark.django_db
class TestModels:
    def test_project_creation(self, user):
        project = Project.objects.create(
            name='Test Project',
            status=StatusChoices.BACKLOG.value
        )
        project.assignees.set([user])
        assert project.name == 'Test Project'
        assert project.status == 'backlog'
        assert user in project.assignees.all()

    def test_task_creation(self, user):
        project = Project.objects.create(name='Test Project')
        task = Task.objects.create(
            name='Test Task',
            project=project,
            is_draft=True,
            status=StatusChoices.TODO.value
        )
        assert task.name == 'Test Task'
        assert task.project == project
        assert task.is_draft is True

    # Add similar tests for WorkingDay, Report, Feedback, ensuring relationships (e.g., Report to Task)
    
class TestProjectAPI(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='user', password='pass')
        self.admin = User.objects.create_superuser(username='admin', password='pass', email='admin@example.com')

        self.project = Project.objects.create(name='Test Project')
        self.project.assignees.set([self.user])

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + access_token)

    def test_list_projects_as_user(self):
        self.authenticate(self.user)
        response = self.client.get(reverse('project-list'))
        assert response.status_code == status.HTTP_200_OK

    def test_list_projects_as_admin(self):
        self.authenticate(self.admin)
        response = self.client.get(reverse('project-list'))
        assert response.status_code == status.HTTP_200_OK

    def test_create_project_as_user(self):
        self.authenticate(self.user)
        data = {'name': 'New Project'}
        response = self.client.post(reverse('project-list'), data)
        assert response.status_code == status.HTTP_403_FORBIDDEN  # Only admins create

# Extend with tests for TaskViewSet, WorkingDayViewSet (including custom actions like check_out), ReportViewSet, FeedbackViewSet
# For JWT auth, use self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token) after obtaining token