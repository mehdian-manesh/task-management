"""
Shared pytest fixtures for core app tests
"""
import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import (
    Project, Task, WorkingDay, Report, Feedback,
    StatusChoices, ReportResultChoices, FeedbackTypeChoices
)


@pytest.fixture
def api_client():
    """API client fixture"""
    return APIClient()


@pytest.fixture
def regular_user():
    """Regular user fixture"""
    return User.objects.create_user(
        username='regular_user',
        password='password123',
        email='regular@test.com',
        first_name='Regular',
        last_name='User'
    )


@pytest.fixture
def admin_user():
    """Admin user fixture"""
    return User.objects.create_superuser(
        username='admin_user',
        password='password123',
        email='admin@test.com',
        first_name='Admin',
        last_name='User'
    )


@pytest.fixture
def authenticated_regular_client(api_client, regular_user):
    """Authenticated API client for regular user"""
    refresh = RefreshToken.for_user(regular_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def authenticated_admin_client(api_client, admin_user):
    """Authenticated API client for admin user"""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def project(regular_user):
    """Project fixture"""
    project = Project.objects.create(
        name='Test Project',
        description='Test description',
        color='#FF0000',
        status=StatusChoices.TODO.value
    )
    project.assignees.set([regular_user])
    return project


@pytest.fixture
def task(regular_user, project):
    """Task fixture"""
    return Task.objects.create(
        name='Test Task',
        description='Test task description',
        project=project,
        created_by=regular_user,
        status=StatusChoices.TODO.value,
        is_draft=False
    )


@pytest.fixture
def working_day(regular_user):
    """WorkingDay fixture"""
    return WorkingDay.objects.create(user=regular_user)


@pytest.fixture
def report(working_day, task):
    """Report fixture"""
    from django.utils import timezone
    from datetime import timedelta
    
    start_time = timezone.now()
    end_time = start_time + timedelta(hours=2)
    
    return Report.objects.create(
        working_day=working_day,
        task=task,
        result=ReportResultChoices.SUCCESS.value,
        comment='Test report',
        start_time=start_time,
        end_time=end_time
    )


@pytest.fixture
def feedback(regular_user):
    """Feedback fixture"""
    return Feedback.objects.create(
        user=regular_user,
        description='Test feedback',
        type=FeedbackTypeChoices.SUGGESTION.value
    )

