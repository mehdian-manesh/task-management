"""
Comprehensive tests for Feedback API endpoints
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Feedback, FeedbackTypeChoices


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
class TestFeedbackList:
    """Tests for GET /api/feedbacks/"""
    
    def test_list_feedbacks_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list feedbacks"""
        response = api_client.get(reverse('feedback-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_own_feedbacks(self, authenticated_regular_client, regular_user):
        """Test user can list only their own feedbacks"""
        Feedback.objects.create(user=regular_user, description='My feedback')
        other_user = User.objects.create_user(username='other', password='pass')
        Feedback.objects.create(user=other_user, description='Other feedback')
        
        response = authenticated_regular_client.get(reverse('feedback-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        feedbacks = response.data.get('results', response.data)
        assert len(feedbacks) == 1
        assert feedbacks[0]['description'] == 'My feedback'
    
    def test_list_all_feedbacks_as_admin(self, authenticated_admin_client, regular_user):
        """Test admin can list all feedbacks"""
        Feedback.objects.create(user=regular_user, description='Feedback 1')
        other_user = User.objects.create_user(username='other', password='pass')
        Feedback.objects.create(user=other_user, description='Feedback 2')
        
        response = authenticated_admin_client.get(reverse('feedback-list'))
        
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        feedbacks = response.data.get('results', response.data)
        assert len(feedbacks) == 2


@pytest.mark.django_db
class TestFeedbackCreate:
    """Tests for POST /api/feedbacks/"""
    
    def test_create_feedback_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot create feedbacks"""
        data = {'description': 'Test feedback'}
        response = api_client.post(reverse('feedback-list'), data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_feedback_success(self, authenticated_regular_client, regular_user):
        """Test successful feedback creation"""
        data = {
            'description': 'This is a test feedback',
            'type': FeedbackTypeChoices.SUGGESTION.value
        }
        response = authenticated_regular_client.post(reverse('feedback-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['description'] == 'This is a test feedback'
        assert response.data['type'] == FeedbackTypeChoices.SUGGESTION.value
        assert response.data['user'] == regular_user.id
        assert Feedback.objects.filter(user=regular_user).exists()
    
    def test_create_feedback_without_type(self, authenticated_regular_client, regular_user):
        """Test creating feedback without type"""
        data = {'description': 'Feedback without type'}
        response = authenticated_regular_client.post(reverse('feedback-list'), data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['type'] is None
    
    def test_create_feedback_all_types(self, authenticated_regular_client, regular_user):
        """Test creating feedbacks with all type choices"""
        for feedback_type in FeedbackTypeChoices:
            data = {
                'description': f'Feedback {feedback_type.value}',
                'type': feedback_type.value
            }
            response = authenticated_regular_client.post(reverse('feedback-list'), data)
            assert response.status_code == status.HTTP_201_CREATED
            assert response.data['type'] == feedback_type.value


@pytest.mark.django_db
class TestFeedbackRetrieve:
    """Tests for GET /api/feedbacks/{id}/"""
    
    def test_retrieve_own_feedback(self, authenticated_regular_client, regular_user):
        """Test user can retrieve their own feedback"""
        feedback = Feedback.objects.create(user=regular_user, description='My feedback')
        response = authenticated_regular_client.get(reverse('feedback-detail', kwargs={'pk': feedback.id}))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['description'] == 'My feedback'
    
    def test_retrieve_other_user_feedback(self, authenticated_regular_client, regular_user):
        """Test user cannot retrieve another user's feedback"""
        other_user = User.objects.create_user(username='other', password='pass')
        feedback = Feedback.objects.create(user=other_user, description='Other feedback')
        response = authenticated_regular_client.get(reverse('feedback-detail', kwargs={'pk': feedback.id}))
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_retrieve_as_admin(self, authenticated_admin_client, regular_user):
        """Test admin can retrieve any feedback"""
        feedback = Feedback.objects.create(user=regular_user, description='Feedback')
        response = authenticated_admin_client.get(reverse('feedback-detail', kwargs={'pk': feedback.id}))
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestFeedbackUpdate:
    """Tests for PATCH/PUT /api/feedbacks/{id}/"""
    
    def test_update_own_feedback(self, authenticated_regular_client, regular_user):
        """Test user can update their own feedback"""
        feedback = Feedback.objects.create(user=regular_user, description='Original')
        data = {'description': 'Updated feedback', 'type': FeedbackTypeChoices.CRITICISM.value}
        response = authenticated_regular_client.patch(reverse('feedback-detail', kwargs={'pk': feedback.id}), data)
        
        assert response.status_code == status.HTTP_200_OK
        feedback.refresh_from_db()
        assert feedback.description == 'Updated feedback'
        assert feedback.type == FeedbackTypeChoices.CRITICISM.value
    
    def test_update_other_user_feedback(self, authenticated_regular_client, regular_user):
        """Test user cannot update another user's feedback"""
        other_user = User.objects.create_user(username='other', password='pass')
        feedback = Feedback.objects.create(user=other_user, description='Other feedback')
        data = {'description': 'Hacked feedback'}
        response = authenticated_regular_client.patch(reverse('feedback-detail', kwargs={'pk': feedback.id}), data)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestFeedbackDelete:
    """Tests for DELETE /api/feedbacks/{id}/"""
    
    def test_delete_own_feedback(self, authenticated_regular_client, regular_user):
        """Test user can delete their own feedback"""
        feedback = Feedback.objects.create(user=regular_user, description='My feedback')
        feedback_id = feedback.id
        response = authenticated_regular_client.delete(reverse('feedback-detail', kwargs={'pk': feedback.id}))
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Feedback.objects.filter(id=feedback_id).exists()
    
    def test_delete_other_user_feedback(self, authenticated_regular_client, regular_user):
        """Test user cannot delete another user's feedback"""
        other_user = User.objects.create_user(username='other', password='pass')
        feedback = Feedback.objects.create(user=other_user, description='Other feedback')
        response = authenticated_regular_client.delete(reverse('feedback-detail', kwargs={'pk': feedback.id}))
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

