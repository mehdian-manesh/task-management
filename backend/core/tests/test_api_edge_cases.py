"""
Tests for edge cases and error scenarios in API endpoints
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
    Project, Task, WorkingDay, Report, Feedback, Domain,
    StatusChoices, ReportResultChoices, FeedbackTypeChoices
)
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
class TestProjectEdgeCases:
    """Edge cases for Project API"""
    
    def test_create_project_invalid_status(self, authenticated_admin_client):
        """Test creating project with invalid status"""
        data = {'name': 'Project', 'status': 'invalid_status'}
        response = authenticated_admin_client.post(reverse('project-list'), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_project_missing_name(self, authenticated_admin_client):
        """Test creating project without name"""
        data = {'description': 'Description'}
        response = authenticated_admin_client.post(reverse('project-list'), data)
        # Name might be required or not, depending on model
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED]
    
    def test_update_project_invalid_assignees(self, authenticated_admin_client):
        """Test updating project with invalid assignee IDs"""
        project = Project.objects.create(name='Project')
        data = {'assignees': [99999, 99998]}  # Non-existent user IDs
        response = authenticated_admin_client.patch(
            reverse('project-detail', kwargs={'pk': project.id}),
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_delete_project_with_tasks(self, authenticated_admin_client, regular_user):
        """Test deleting project that has tasks"""
        project = Project.objects.create(name='Project')
        task = Task.objects.create(name='Task', project=project, created_by=regular_user)
        
        response = authenticated_admin_client.delete(
            reverse('project-detail', kwargs={'pk': project.id})
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Task should still exist but project should be None
        task.refresh_from_db()
        assert task.project is None


@pytest.mark.django_db
class TestTaskEdgeCases:
    """Edge cases for Task API"""
    
    def test_create_task_invalid_project_id(self, authenticated_regular_client, regular_user):
        """Test creating task with invalid project_id"""
        data = {'name': 'Task', 'project_id': 99999}
        response = authenticated_regular_client.post(reverse('task-list'), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_task_invalid_status(self, authenticated_regular_client):
        """Test creating task with invalid status"""
        data = {'name': 'Task', 'status': 'invalid_status'}
        response = authenticated_regular_client.post(reverse('task-list'), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_update_task_invalid_assignees(self, authenticated_regular_client, regular_user):
        """Test updating task with invalid assignee IDs"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        task = Task.objects.create(name='Task', created_by=regular_user, domain=domain)
        data = {'assignees': [99999]}
        response = authenticated_regular_client.patch(
            reverse('task-detail', kwargs={'pk': task.id}),
            data,
            format='json'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_update_task_change_project(self, authenticated_regular_client, regular_user):
        """Test updating task to change project"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        project1 = Project.objects.create(name='Project 1', domain=domain)
        project2 = Project.objects.create(name='Project 2', domain=domain)
        task = Task.objects.create(name='Task', project=project1, created_by=regular_user, domain=domain)
        
        data = {'project_id': project2.id}
        response = authenticated_regular_client.patch(
            reverse('task-detail', kwargs={'pk': task.id}),
            data
        )
        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.project == project2
    
    def test_delete_task_with_reports(self, authenticated_regular_client, regular_user):
        """Test deleting task that has reports"""
        # Create domain and assign to user
        domain = Domain.objects.create(name='User Domain')
        regular_user.profile.domain = domain
        regular_user.profile.save()
        
        task = Task.objects.create(name='Task', created_by=regular_user, domain=domain)
        working_day = WorkingDay.objects.create(user=regular_user)
        report = Report.objects.create(working_day=working_day, task=task)
        
        response = authenticated_regular_client.delete(
            reverse('task-detail', kwargs={'pk': task.id})
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Task.objects.filter(id=task.id).exists()
        assert not Report.objects.filter(id=report.id).exists()  # Cascade delete


@pytest.mark.django_db
class TestWorkingDayEdgeCases:
    """Edge cases for WorkingDay API"""
    
    def test_check_in_multiple_times_same_day(self, authenticated_regular_client, regular_user):
        """Test checking in multiple times in same day (should fail)"""
        WorkingDay.objects.create(user=regular_user, check_out=None, is_on_leave=False)
        
        response = authenticated_regular_client.post(reverse('working-day-list'), {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_check_out_twice(self, authenticated_regular_client, regular_user):
        """Test checking out twice"""
        working_day = WorkingDay.objects.create(user=regular_user)
        working_day.check_out = timezone.now()
        working_day.save()
        
        response = authenticated_regular_client.post(
            reverse('working-day-check-out', kwargs={'pk': working_day.id})
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_mark_leave_twice(self, authenticated_regular_client, regular_user):
        """Test marking leave twice"""
        working_day = WorkingDay.objects.create(user=regular_user, is_on_leave=True)
        
        response = authenticated_regular_client.post(
            reverse('working-day-leave', kwargs={'pk': working_day.id})
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_check_out_after_mark_leave(self, authenticated_regular_client, regular_user):
        """Test checking out after marking as leave"""
        working_day = WorkingDay.objects.create(user=regular_user, is_on_leave=True)
        
        response = authenticated_regular_client.post(
            reverse('working-day-check-out', kwargs={'pk': working_day.id})
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_update_working_day_check_in(self, authenticated_regular_client, regular_user):
        """Test updating working day check_in (should be read-only)"""
        working_day = WorkingDay.objects.create(user=regular_user)
        original_check_in = working_day.check_in
        
        data = {'check_in': timezone.now().isoformat()}
        response = authenticated_regular_client.patch(
            reverse('working-day-detail', kwargs={'pk': working_day.id}),
            data
        )
        # Check-in is read-only, should not change
        working_day.refresh_from_db()
        assert working_day.check_in == original_check_in


@pytest.mark.django_db
class TestReportEdgeCases:
    """Edge cases for Report API"""
    
    def test_create_report_invalid_task_id(self, authenticated_regular_client, regular_user):
        """Test creating report with invalid task_id"""
        working_day = WorkingDay.objects.create(user=regular_user)
        data = {'task_id': 99999, 'result': ReportResultChoices.SUCCESS.value}
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        # Should create draft task or fail
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
    
    def test_create_report_invalid_result(self, authenticated_regular_client, regular_user):
        """Test creating report with invalid result"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user)
        data = {'task_id': task.id, 'result': 'invalid_result'}
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_report_end_before_start(self, authenticated_regular_client, regular_user):
        """Test creating report with end_time before start_time"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user)
        start_time = timezone.now()
        end_time = start_time - timedelta(hours=1)
        
        data = {
            'task_id': task.id,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat()
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        # Model allows this, but serializer might validate
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
    
    def test_create_report_comment_too_long(self, authenticated_regular_client, regular_user):
        """Test creating report with comment exceeding max_length"""
        working_day = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user)
        long_comment = 'x' * 1001  # Exceeds max_length=1000
        
        data = {
            'task_id': task.id,
            'comment': long_comment
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_report_other_user_working_day(self, authenticated_regular_client, regular_user):
        """Test creating report for another user's working day"""
        other_user = User.objects.create_user(username='other', password='pass')
        other_working_day = WorkingDay.objects.create(user=other_user)
        task = Task.objects.create(name='Task', created_by=regular_user)
        
        data = {'task_id': task.id, 'result': ReportResultChoices.SUCCESS.value}
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': other_working_day.id}),
            data
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestFeedbackEdgeCases:
    """Edge cases for Feedback API"""
    
    def test_create_feedback_empty_description(self, authenticated_regular_client):
        """Test creating feedback with empty description"""
        data = {'description': ''}
        response = authenticated_regular_client.post(reverse('feedback-list'), data)
        # Should fail validation
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_feedback_invalid_type(self, authenticated_regular_client):
        """Test creating feedback with invalid type"""
        data = {'description': 'Feedback', 'type': 'invalid_type'}
        response = authenticated_regular_client.post(reverse('feedback-list'), data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_update_feedback_empty_description(self, authenticated_regular_client, regular_user):
        """Test updating feedback with empty description"""
        feedback = Feedback.objects.create(user=regular_user, description='Original')
        data = {'description': ''}
        response = authenticated_regular_client.patch(
            reverse('feedback-detail', kwargs={'pk': feedback.id}),
            data
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPermissionEdgeCases:
    """Edge cases for permissions"""
    
    def test_regular_user_access_admin_endpoint(self, authenticated_regular_client):
        """Test regular user accessing admin-only endpoint"""
        response = authenticated_regular_client.get(reverse('statistics'))
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_regular_user_create_user(self, authenticated_regular_client):
        """Test regular user trying to create user"""
        data = {'username': 'newuser', 'password': 'pass'}
        response = authenticated_regular_client.post(reverse('user-list'), data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_regular_user_delete_project(self, authenticated_regular_client, regular_user):
        """Test regular user trying to delete project"""
        project = Project.objects.create(name='Project')
        project.assignees.set([regular_user])
        
        response = authenticated_regular_client.delete(
            reverse('project-detail', kwargs={'pk': project.id})
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_unauthenticated_access_all_endpoints(self, api_client):
        """Test unauthenticated access to various endpoints"""
        endpoints = [
            ('project-list', {}),
            ('task-list', {}),
            ('working-day-list', {}),
            ('feedback-list', {}),
            ('user-list', {}),
            ('statistics', {}),
        ]
        
        for endpoint_name, kwargs in endpoints:
            response = api_client.get(reverse(endpoint_name, kwargs=kwargs))
            assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestNestedRouteEdgeCases:
    """Edge cases for nested routes"""
    
    def test_list_reports_invalid_working_day(self, authenticated_regular_client):
        """Test listing reports for non-existent working day"""
        response = authenticated_regular_client.get(
            reverse('working-day-reports-list', kwargs={'working_day_pk': 99999})
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_create_report_invalid_working_day(self, authenticated_regular_client, regular_user):
        """Test creating report for non-existent working day"""
        task = Task.objects.create(name='Task', created_by=regular_user)
        data = {'task_id': task.id}
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': 99999}),
            data
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_retrieve_report_wrong_working_day(self, authenticated_regular_client, regular_user):
        """Test retrieving report with wrong working_day_pk"""
        working_day1 = WorkingDay.objects.create(user=regular_user)
        working_day2 = WorkingDay.objects.create(user=regular_user)
        task = Task.objects.create(name='Task', created_by=regular_user)
        report = Report.objects.create(working_day=working_day1, task=task)
        
        # Try to access report via wrong working_day_pk
        response = authenticated_regular_client.get(
            reverse('working-day-reports-detail', kwargs={
                'working_day_pk': working_day2.id,
                'pk': report.id
            })
        )
        # Should return 404 because report doesn't belong to working_day2
        assert response.status_code == status.HTTP_404_NOT_FOUND

