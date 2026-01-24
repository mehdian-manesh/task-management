"""
Comprehensive tests for WorkingDay API endpoints
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import WorkingDay


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
class TestWorkingDayList:
    """Tests for GET /api/working-days/"""
    
    def test_list_working_days_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list working days"""
        response = api_client.get(reverse('working-day-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_own_working_days(self, authenticated_regular_client, regular_user):
        """Test user can list only their own working days"""
        WorkingDay.objects.create(user=regular_user)
        other_user = User.objects.create_user(username='other', password='pass')
        WorkingDay.objects.create(user=other_user)
        
        response = authenticated_regular_client.get(reverse('working-day-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        working_days = response.data.get('results', response.data)
        assert len(working_days) == 1
        assert working_days[0]['user'] == regular_user.id
    
    def test_list_all_working_days_as_admin(self, authenticated_admin_client, regular_user):
        """Test admin can list all working days"""
        WorkingDay.objects.create(user=regular_user)
        other_user = User.objects.create_user(username='other', password='pass')
        WorkingDay.objects.create(user=other_user)
        
        response = authenticated_admin_client.get(reverse('working-day-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        working_days = response.data.get('results', response.data)
        assert len(working_days) == 2


@pytest.mark.django_db
class TestWorkingDayCreate:
    """Tests for POST /api/working-days/ (check-in)"""
    
    def test_create_working_day_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot create working days"""
        response = api_client.post(reverse('working-day-list'), {})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_check_in_success(self, authenticated_regular_client, regular_user):
        """Test successful check-in"""
        response = authenticated_regular_client.post(reverse('working-day-list'), {})
        
        assert response.status_code == status.HTTP_201_CREATED
        assert WorkingDay.objects.filter(user=regular_user, check_out__isnull=True).exists()
        assert 'check_in' in response.data
    
    def test_check_in_with_existing_open_day(self, authenticated_regular_client, regular_user):
        """Test check-in fails when user has open working day"""
        WorkingDay.objects.create(user=regular_user, check_out=None)
        
        response = authenticated_regular_client.post(reverse('working-day-list'), {})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'check-out' in response.data['detail'].lower() or 'باز' in response.data['detail']
    
    def test_check_in_with_closed_day_allowed(self, authenticated_regular_client, regular_user):
        """Test check-in allowed when previous day is closed"""
        WorkingDay.objects.create(
            user=regular_user,
            check_out=timezone.now()
        )
        
        response = authenticated_regular_client.post(reverse('working-day-list'), {})
        
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_check_in_with_leave_day_allowed(self, authenticated_regular_client, regular_user):
        """Test check-in allowed when previous day is on leave"""
        WorkingDay.objects.create(
            user=regular_user,
            is_on_leave=True,
            check_out=None
        )
        
        response = authenticated_regular_client.post(reverse('working-day-list'), {})
        
        assert response.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestWorkingDayCheckOut:
    """Tests for POST /api/working-days/{id}/check-out/"""
    
    def test_check_out_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot check out"""
        working_day = WorkingDay.objects.create(user=User.objects.create_user(username='u', password='p'))
        response = api_client.post(reverse('working-day-check-out', kwargs={'pk': working_day.id}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_check_out_success(self, authenticated_regular_client, regular_user):
        """Test successful check-out"""
        working_day = WorkingDay.objects.create(user=regular_user)
        response = authenticated_regular_client.post(reverse('working-day-check-out', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_200_OK
        working_day.refresh_from_db()
        assert working_day.check_out is not None
        assert 'check_out' in response.data
    
    def test_check_out_already_checked_out(self, authenticated_regular_client, regular_user):
        """Test check-out fails when already checked out"""
        working_day = WorkingDay.objects.create(
            user=regular_user,
            check_out=timezone.now()
        )
        response = authenticated_regular_client.post(reverse('working-day-check-out', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_check_out_on_leave(self, authenticated_regular_client, regular_user):
        """Test check-out fails when day is on leave"""
        working_day = WorkingDay.objects.create(
            user=regular_user,
            is_on_leave=True
        )
        response = authenticated_regular_client.post(reverse('working-day-check-out', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_check_out_other_user_day(self, authenticated_regular_client, regular_user):
        """Test user cannot check out another user's working day"""
        other_user = User.objects.create_user(username='other', password='pass')
        working_day = WorkingDay.objects.create(user=other_user)
        response = authenticated_regular_client.post(reverse('working-day-check-out', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestWorkingDayLeave:
    """Tests for POST /api/working-days/{id}/leave/"""
    
    def test_mark_leave_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot mark leave"""
        working_day = WorkingDay.objects.create(user=User.objects.create_user(username='u', password='p'))
        response = api_client.post(reverse('working-day-leave', kwargs={'pk': working_day.id}))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_mark_leave_success(self, authenticated_regular_client, regular_user):
        """Test successful marking as leave"""
        working_day = WorkingDay.objects.create(user=regular_user)
        response = authenticated_regular_client.post(reverse('working-day-leave', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_200_OK
        working_day.refresh_from_db()
        assert working_day.is_on_leave is True
        assert 'is_on_leave' in response.data
    
    def test_mark_leave_already_on_leave(self, authenticated_regular_client, regular_user):
        """Test marking leave fails when already on leave"""
        working_day = WorkingDay.objects.create(
            user=regular_user,
            is_on_leave=True
        )
        response = authenticated_regular_client.post(reverse('working-day-leave', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_mark_leave_other_user_day(self, authenticated_regular_client, regular_user):
        """Test user cannot mark leave for another user's day"""
        other_user = User.objects.create_user(username='other', password='pass')
        working_day = WorkingDay.objects.create(user=other_user)
        response = authenticated_regular_client.post(reverse('working-day-leave', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestWorkingDayRetrieve:
    """Tests for GET /api/working-days/{id}/"""
    
    def test_retrieve_own_working_day(self, authenticated_regular_client, regular_user):
        """Test user can retrieve their own working day"""
        working_day = WorkingDay.objects.create(user=regular_user)
        response = authenticated_regular_client.get(reverse('working-day-detail', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user'] == regular_user.id
        assert 'date' in response.data  # Serializer includes date field
    
    def test_retrieve_other_user_working_day(self, authenticated_regular_client, regular_user):
        """Test user cannot retrieve another user's working day"""
        other_user = User.objects.create_user(username='other', password='pass')
        working_day = WorkingDay.objects.create(user=other_user)
        response = authenticated_regular_client.get(reverse('working-day-detail', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_retrieve_as_admin(self, authenticated_admin_client, regular_user):
        """Test admin can retrieve any working day"""
        working_day = WorkingDay.objects.create(user=regular_user)
        response = authenticated_admin_client.get(reverse('working-day-detail', kwargs={'pk': working_day.id}))
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestWorkingDayUpdate:
    """Tests for PATCH/PUT /api/working-days/{id}/"""
    
    def test_update_own_working_day(self, authenticated_regular_client, regular_user):
        """Test user can update their own working day"""
        working_day = WorkingDay.objects.create(user=regular_user)
        data = {'is_on_leave': True}
        response = authenticated_regular_client.patch(reverse('working-day-detail', kwargs={'pk': working_day.id}), data)
        
        assert response.status_code == status.HTTP_200_OK
        working_day.refresh_from_db()
        assert working_day.is_on_leave is True

