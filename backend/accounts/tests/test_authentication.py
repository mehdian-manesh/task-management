"""
Comprehensive tests for authentication
"""
import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.serializers import CustomTokenObtainPairSerializer


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user():
    return User.objects.create_user(username='testuser', password='testpass123', email='test@test.com')


@pytest.fixture
def admin_user():
    return User.objects.create_superuser(username='admin', password='adminpass123', email='admin@test.com')


@pytest.mark.django_db
class TestLogin:
    """Tests for POST /api/login/"""
    
    def test_login_success(self, api_client, user):
        """Test successful login with valid credentials"""
        data = {'username': 'testuser', 'password': 'testpass123'}
        response = api_client.post(reverse('token_obtain_pair'), data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
    
    def test_login_invalid_username(self, api_client):
        """Test login with invalid username"""
        data = {'username': 'nonexistent', 'password': 'password'}
        response = api_client.post(reverse('token_obtain_pair'), data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_invalid_password(self, api_client, user):
        """Test login with invalid password"""
        data = {'username': 'testuser', 'password': 'wrongpassword'}
        response = api_client.post(reverse('token_obtain_pair'), data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_login_missing_credentials(self, api_client):
        """Test login with missing credentials"""
        response = api_client.post(reverse('token_obtain_pair'), {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_login_token_contains_custom_claims(self, api_client, user):
        """Test that JWT token contains custom claims"""
        data = {'username': 'testuser', 'password': 'testpass123'}
        response = api_client.post(reverse('token_obtain_pair'), data)
        
        assert response.status_code == status.HTTP_200_OK
        access_token = response.data['access']
        
        # Decode token to check claims
        from rest_framework_simplejwt.tokens import UntypedToken
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
        from jwt import decode as jwt_decode
        from django.conf import settings
        
        try:
            untyped_token = UntypedToken(access_token)
            decoded_token = jwt_decode(access_token, settings.SECRET_KEY, algorithms=["HS256"])
            assert decoded_token['username'] == user.username
            assert decoded_token['is_staff'] == user.is_staff
        except (InvalidToken, TokenError) as e:
            pytest.fail(f"Token validation failed: {e}")


@pytest.mark.django_db
class TestTokenRefresh:
    """Tests for POST /api/token/refresh/"""
    
    def test_token_refresh_success(self, api_client, user):
        """Test successful token refresh"""
        refresh = RefreshToken.for_user(user)
        data = {'refresh': str(refresh)}
        response = api_client.post(reverse('token_refresh'), data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
    
    def test_token_refresh_invalid_token(self, api_client):
        """Test token refresh with invalid refresh token"""
        data = {'refresh': 'invalid_token'}
        response = api_client.post(reverse('token_refresh'), data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_token_refresh_missing_token(self, api_client):
        """Test token refresh with missing token"""
        response = api_client.post(reverse('token_refresh'), {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestLogout:
    """Tests for POST /api/logout/"""
    
    def test_logout_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot logout"""
        response = api_client.post(reverse('logout'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_logout_success(self, api_client, user):
        """Test successful logout"""
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = api_client.post(reverse('logout'))
        
        assert response.status_code == status.HTTP_200_OK
        assert 'detail' in response.data


@pytest.mark.django_db
class TestCustomTokenSerializer:
    """Tests for CustomTokenObtainPairSerializer"""
    
    def test_custom_token_serializer_claims(self, user):
        """Test that custom serializer adds claims to token"""
        serializer = CustomTokenObtainPairSerializer()
        token = serializer.get_token(user)
        
        assert token['is_staff'] == user.is_staff
        assert token['username'] == user.username
    
    def test_custom_token_serializer_admin_claims(self, admin_user):
        """Test custom serializer with admin user"""
        serializer = CustomTokenObtainPairSerializer()
        token = serializer.get_token(admin_user)
        
        assert token['is_staff'] is True
        assert token['username'] == admin_user.username


@pytest.mark.django_db
class TestProtectedEndpoints:
    """Tests for protected endpoints requiring authentication"""
    
    def test_protected_endpoint_without_token(self, api_client):
        """Test accessing protected endpoint without token"""
        response = api_client.get(reverse('project-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_protected_endpoint_with_invalid_token(self, api_client):
        """Test accessing protected endpoint with invalid token"""
        api_client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token')
        response = api_client.get(reverse('project-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_protected_endpoint_with_valid_token(self, api_client, user):
        """Test accessing protected endpoint with valid token"""
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        response = api_client.get(reverse('project-list'))
        assert response.status_code == status.HTTP_200_OK
    
    def test_protected_endpoint_with_expired_token(self, api_client, user):
        """Test accessing protected endpoint with expired token"""
        from datetime import timedelta
        from django.utils import timezone
        from rest_framework_simplejwt.tokens import AccessToken
        
        # Create an expired token
        access = AccessToken.for_user(user)
        access.set_exp(from_time=timezone.now() - timedelta(hours=1), lifetime=timedelta(hours=1))
        
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(access)}')
        response = api_client.get(reverse('project-list'))
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

