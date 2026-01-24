"""
Test to verify admin users can create reports for other users' working days
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import WorkingDay, Task, Report, ReportResultChoices


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
def test_admin_can_create_report_for_other_user_working_day(authenticated_admin_client, regular_user, admin_user):
    """Test that admin can create report for another user's working day"""
    # Create a working day for regular_user
    working_day = WorkingDay.objects.create(user=regular_user)
    
    # Create a task
    task = Task.objects.create(name='Test Task', created_by=regular_user)
    
    # Admin tries to create a report for regular_user's working day
    data = {
        'task_id': task.id,
        'result': ReportResultChoices.SUCCESS.value,
        'comment': 'Admin created this report'
    }
    
    response = authenticated_admin_client.post(
        reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
        data
    )
    
    # Should succeed - admin can create reports for any working day
    assert response.status_code == status.HTTP_201_CREATED
    assert Report.objects.filter(working_day=working_day, task=task).exists()


@pytest.mark.django_db
def test_regular_user_cannot_create_report_for_other_user_working_day(api_client, regular_user):
    """Test that regular user cannot create report for another user's working day"""
    other_user = User.objects.create_user(username='other', password='pass')
    other_working_day = WorkingDay.objects.create(user=other_user)
    task = Task.objects.create(name='Task', created_by=other_user)
    
    # Authenticate as regular_user
    refresh = RefreshToken.for_user(regular_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    
    data = {
        'task_id': task.id,
        'result': ReportResultChoices.SUCCESS.value
    }
    
    response = api_client.post(
        reverse('working-day-reports-list', kwargs={'working_day_pk': other_working_day.id}),
        data
    )
    
    # Should fail - regular users can only create reports for their own working days
    assert response.status_code == status.HTTP_404_NOT_FOUND

