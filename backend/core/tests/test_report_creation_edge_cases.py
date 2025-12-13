"""
Tests for report creation edge cases - empty strings, whitespace, etc.
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
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
def authenticated_regular_client(api_client, regular_user):
    refresh = RefreshToken.for_user(regular_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def working_day(regular_user):
    return WorkingDay.objects.create(user=regular_user)


@pytest.fixture
def task(regular_user):
    return Task.objects.create(name='Existing Task', created_by=regular_user)


@pytest.mark.django_db
class TestReportCreationEdgeCases:
    """Tests for edge cases in report creation with task_id and task_name"""
    
    def test_create_report_with_empty_string_task_id(self, authenticated_regular_client, working_day, task):
        """Test that empty string task_id is converted to None"""
        data = {
            'task_id': '',
            'task_name': 'New Task from Empty ID',
            'result': ReportResultChoices.ONGOING.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        # Should create new task from task_name
        new_task = Task.objects.get(name='New Task from Empty ID')
        assert new_task.is_draft is True
    
    def test_create_report_with_empty_string_task_name(self, authenticated_regular_client, working_day, task):
        """Test that empty string task_name is converted to None"""
        data = {
            'task_id': task.id,
            'task_name': '',
            'result': ReportResultChoices.SUCCESS.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        # Should use existing task_id
        assert Report.objects.filter(working_day=working_day, task=task).exists()
    
    def test_create_report_with_whitespace_only_task_name(self, authenticated_regular_client, working_day):
        """Test that whitespace-only task_name is converted to None"""
        data = {
            'task_name': '   ',
            'result': ReportResultChoices.ONGOING.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Should fail because both task_id and task_name are None
    
    def test_create_report_with_whitespace_task_name_trimmed(self, authenticated_regular_client, working_day):
        """Test that task_name with leading/trailing whitespace is trimmed"""
        data = {
            'task_name': '  Trimmed Task Name  ',
            'result': ReportResultChoices.ONGOING.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Trimmed Task Name')
        assert task.name == 'Trimmed Task Name'  # Should be trimmed
        assert task.is_draft is True
    
    def test_create_report_with_both_empty_strings(self, authenticated_regular_client, working_day):
        """Test that both empty strings result in validation error"""
        data = {
            'task_id': '',
            'task_name': '',
            'result': ReportResultChoices.SUCCESS.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'task_id' in response.data or 'task_name' in response.data or 'non_field_errors' in response.data
    
    def test_create_report_with_invalid_task_id_and_empty_task_name(self, authenticated_regular_client, working_day):
        """Test that invalid task_id with empty task_name fails"""
        data = {
            'task_id': 99999,  # Non-existent task
            'task_name': '',
            'result': ReportResultChoices.SUCCESS.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_report_with_invalid_task_id_and_whitespace_task_name(self, authenticated_regular_client, working_day):
        """Test that invalid task_id with whitespace-only task_name fails"""
        data = {
            'task_id': 99999,  # Non-existent task
            'task_name': '   ',
            'result': ReportResultChoices.SUCCESS.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_report_with_invalid_task_id_and_valid_task_name(self, authenticated_regular_client, working_day):
        """Test that invalid task_id with valid task_name creates new task"""
        data = {
            'task_id': 99999,  # Non-existent task
            'task_name': 'Fallback Task',
            'result': ReportResultChoices.ONGOING.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='Fallback Task')
        assert task.is_draft is True
        assert task.created_by == working_day.user
    
    def test_create_report_with_valid_task_id_and_whitespace_task_name(self, authenticated_regular_client, working_day, task):
        """Test that valid task_id with whitespace task_name uses task_id"""
        data = {
            'task_id': task.id,
            'task_name': '   ',
            'result': ReportResultChoices.SUCCESS.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        # Should use existing task, not create new one
        assert Report.objects.filter(working_day=working_day, task=task).exists()
        assert not Task.objects.filter(name__iexact='   ').exists()
    
    def test_create_report_with_none_task_id_and_valid_task_name(self, authenticated_regular_client, working_day):
        """Test that None task_id with valid task_name creates new task"""
        data = {
            'task_name': 'New Task from None',
            'result': ReportResultChoices.ONGOING.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='New Task from None')
        assert task.is_draft is True
    
    def test_create_report_with_valid_task_id_and_none_task_name(self, authenticated_regular_client, working_day, task):
        """Test that valid task_id with None task_name uses task_id"""
        data = {
            'task_id': task.id,
            'result': ReportResultChoices.SUCCESS.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Report.objects.filter(working_day=working_day, task=task).exists()
    
    def test_create_report_with_both_none(self, authenticated_regular_client, working_day):
        """Test that both None values result in validation error"""
        data = {
            'result': ReportResultChoices.SUCCESS.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
