"""
Comprehensive tests for Report API endpoints (nested under working-days)
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import WorkingDay, Task, Report, ReportResultChoices, StatusChoices


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


@pytest.fixture
def working_day(regular_user):
    return WorkingDay.objects.create(user=regular_user)


@pytest.fixture
def task(regular_user):
    return Task.objects.create(name='Test Task', created_by=regular_user)


@pytest.mark.django_db
class TestReportList:
    """Tests for GET /api/working-days/{id}/reports/"""
    
    def test_list_reports_unauthenticated(self, api_client, working_day):
        """Test that unauthenticated users cannot list reports"""
        response = api_client.get(reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_own_reports(self, authenticated_regular_client, regular_user, working_day, task):
        """Test user can list reports for their own working day"""
        Report.objects.create(working_day=working_day, task=task)
        Report.objects.create(working_day=working_day, task=task)
        
        response = authenticated_regular_client.get(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id})
        )
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        reports = response.data.get('results', response.data)
        assert len(reports) == 2
    
    def test_list_other_user_reports(self, authenticated_regular_client, regular_user):
        """Test user cannot list reports for another user's working day"""
        other_user = User.objects.create_user(username='other', password='pass')
        other_working_day = WorkingDay.objects.create(user=other_user)
        task = Task.objects.create(name='Task', created_by=other_user)
        Report.objects.create(working_day=other_working_day, task=task)
        
        response = authenticated_regular_client.get(
            reverse('working-day-reports-list', kwargs={'working_day_pk': other_working_day.id})
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_list_all_reports_as_admin(self, authenticated_admin_client, regular_user, working_day, task):
        """Test admin can list all reports"""
        Report.objects.create(working_day=working_day, task=task)
        response = authenticated_admin_client.get(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id})
        )
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestReportCreate:
    """Tests for POST /api/working-days/{id}/reports/"""
    
    def test_create_report_unauthenticated(self, api_client, working_day, task):
        """Test that unauthenticated users cannot create reports"""
        data = {'task_id': task.id, 'result': ReportResultChoices.SUCCESS.value}
        response = api_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_report_with_task_id(self, authenticated_regular_client, working_day, task):
        """Test creating report with existing task_id"""
        start_time = timezone.now()
        end_time = start_time + timedelta(hours=2)
        data = {
            'task_id': task.id,
            'result': ReportResultChoices.SUCCESS.value,
            'comment': 'Completed successfully',
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat()
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Report.objects.filter(working_day=working_day, task=task).exists()
    
    def test_create_report_with_task_name(self, authenticated_regular_client, working_day):
        """Test creating report with task_name (auto-creates draft task)"""
        data = {
            'task_name': 'New Task',
            'result': ReportResultChoices.ONGOING.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        task = Task.objects.get(name='New Task')
        assert task.is_draft is True
        assert task.created_by == working_day.user
    
    def test_create_report_missing_task_info(self, authenticated_regular_client, working_day):
        """Test creating report without task_id or task_name fails"""
        data = {'result': ReportResultChoices.SUCCESS.value}
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_report_other_user_working_day(self, authenticated_regular_client, regular_user):
        """Test user cannot create report for another user's working day"""
        other_user = User.objects.create_user(username='other', password='pass')
        other_working_day = WorkingDay.objects.create(user=other_user)
        task = Task.objects.create(name='Task', created_by=other_user)
        
        data = {'task_id': task.id, 'result': ReportResultChoices.SUCCESS.value}
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': other_working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_create_report_updates_task_status(self, authenticated_regular_client, working_day, task):
        """Test that creating report updates task status based on result"""
        assert task.status != StatusChoices.DONE.value
        data = {
            'task_id': task.id,
            'result': ReportResultChoices.SUCCESS.value
        }
        response = authenticated_regular_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        task.refresh_from_db()
        assert task.status == StatusChoices.DONE.value
    
    def test_admin_create_report_for_other_user_working_day(self, authenticated_admin_client, regular_user):
        """Test admin can create report for another user's working day"""
        other_user = User.objects.create_user(username='other', password='pass')
        other_working_day = WorkingDay.objects.create(user=other_user)
        task = Task.objects.create(name='Task', created_by=other_user)
        
        data = {'task_id': task.id, 'result': ReportResultChoices.SUCCESS.value}
        response = authenticated_admin_client.post(
            reverse('working-day-reports-list', kwargs={'working_day_pk': other_working_day.id}),
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Report.objects.filter(working_day=other_working_day, task=task).exists()


@pytest.mark.django_db
class TestReportRetrieve:
    """Tests for GET /api/working-days/{id}/reports/{report_id}/"""
    
    def test_retrieve_own_report(self, authenticated_regular_client, working_day, task):
        """Test user can retrieve their own report"""
        report = Report.objects.create(working_day=working_day, task=task)
        response = authenticated_regular_client.get(
            reverse('working-day-reports-detail', kwargs={
                'working_day_pk': working_day.id,
                'pk': report.id
            })
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == report.id
        assert 'task' in response.data  # Detail serializer includes task
    
    def test_retrieve_other_user_report(self, authenticated_regular_client, regular_user):
        """Test user cannot retrieve another user's report"""
        other_user = User.objects.create_user(username='other', password='pass')
        other_working_day = WorkingDay.objects.create(user=other_user)
        task = Task.objects.create(name='Task', created_by=other_user)
        report = Report.objects.create(working_day=other_working_day, task=task)
        
        response = authenticated_regular_client.get(
            reverse('working-day-reports-detail', kwargs={
                'working_day_pk': other_working_day.id,
                'pk': report.id
            })
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestReportUpdate:
    """Tests for PATCH/PUT /api/working-days/{id}/reports/{report_id}/"""
    
    def test_update_own_report(self, authenticated_regular_client, working_day, task):
        """Test user can update their own report"""
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            result=ReportResultChoices.ONGOING.value
        )
        data = {'result': ReportResultChoices.SUCCESS.value, 'comment': 'Updated comment'}
        response = authenticated_regular_client.patch(
            reverse('working-day-reports-detail', kwargs={
                'working_day_pk': working_day.id,
                'pk': report.id
            }),
            data
        )
        
        assert response.status_code == status.HTTP_200_OK
        report.refresh_from_db()
        assert report.result == ReportResultChoices.SUCCESS.value
        assert report.comment == 'Updated comment'
    
    def test_update_report_updates_task_status(self, authenticated_regular_client, working_day, task):
        """Test that updating report updates task status"""
        report = Report.objects.create(
            working_day=working_day,
            task=task,
            result=ReportResultChoices.ONGOING.value
        )
        data = {'result': ReportResultChoices.SUCCESS.value}
        response = authenticated_regular_client.patch(
            reverse('working-day-reports-detail', kwargs={
                'working_day_pk': working_day.id,
                'pk': report.id
            }),
            data
        )
        
        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.status == StatusChoices.DONE.value


@pytest.mark.django_db
class TestReportDelete:
    """Tests for DELETE /api/working-days/{id}/reports/{report_id}/"""
    
    def test_delete_own_report(self, authenticated_regular_client, working_day, task):
        """Test user can delete their own report"""
        report = Report.objects.create(working_day=working_day, task=task)
        report_id = report.id
        response = authenticated_regular_client.delete(
            reverse('working-day-reports-detail', kwargs={
                'working_day_pk': working_day.id,
                'pk': report.id
            })
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Report.objects.filter(id=report_id).exists()

