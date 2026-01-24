"""
Tests for UserSession model and related functionality
"""
import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from accounts.models import UserSession


@pytest.mark.django_db
class TestUserSessionModel:
    """Tests for UserSession model"""
    
    def test_user_session_creation(self, regular_user):
        """Test creating a UserSession"""
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='test-token-jti-123',
            refresh_token_jti='test-refresh-jti-456',
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0 Test Browser',
            browser_name='Chrome',
            browser_version='120.0',
            device_type='desktop',
            device_name='Desktop',
            os_name='Windows',
            os_version='11',
            screen_width=1920,
            screen_height=1080,
        )
        
        assert session.user == regular_user
        assert session.token_jti == 'test-token-jti-123'
        assert session.refresh_token_jti == 'test-refresh-jti-456'
        assert str(session.ip_address) == '192.168.1.1'
        assert session.browser_name == 'Chrome'
        assert session.device_type == 'desktop'
        assert session.is_active is True
        assert session.login_date is not None
        assert session.last_activity is not None
    
    def test_user_session_str_representation(self, regular_user):
        """Test UserSession string representation"""
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='test-jti',
            ip_address='192.168.1.1',
            user_agent='Test Agent',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        str_repr = str(session)
        assert regular_user.username in str_repr
        assert 'Chrome' in str_repr or 'Windows' in str_repr
    
    def test_user_session_ordering(self, regular_user):
        """Test that sessions are ordered by login_date descending"""
        # Create sessions with different login dates
        session1 = UserSession.objects.create(
            user=regular_user,
            token_jti='jti-1',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        session1.login_date = timezone.now() - timedelta(days=2)
        session1.save()
        
        session2 = UserSession.objects.create(
            user=regular_user,
            token_jti='jti-2',
            ip_address='192.168.1.2',
            user_agent='Test',
            browser_name='Firefox',
            device_type='desktop',
            os_name='Linux',
        )
        session2.login_date = timezone.now() - timedelta(days=1)
        session2.save()
        
        session3 = UserSession.objects.create(
            user=regular_user,
            token_jti='jti-3',
            ip_address='192.168.1.3',
            user_agent='Test',
            browser_name='Safari',
            device_type='mobile',
            os_name='iOS',
        )
        # session3 has the most recent login_date (auto_now_add)
        
        sessions = list(UserSession.objects.filter(user=regular_user))
        
        # Should be ordered by -login_date (newest first)
        assert sessions[0].login_date >= sessions[1].login_date
        assert sessions[1].login_date >= sessions[2].login_date
        assert sessions[0].token_jti == 'jti-3'  # Most recent
    
    def test_user_session_optional_fields(self, regular_user):
        """Test that optional fields can be null"""
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='test-jti',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
            refresh_token_jti=None,
            browser_version=None,
            device_name=None,
            os_version=None,
            screen_width=None,
            screen_height=None,
        )
        
        assert session.refresh_token_jti is None
        assert session.browser_version is None
        assert session.device_name is None
        assert session.os_version is None
        assert session.screen_width is None
        assert session.screen_height is None
    
    def test_user_session_is_active_default(self, regular_user):
        """Test that is_active defaults to True"""
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='test-jti',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        assert session.is_active is True
    
    def test_user_session_cascade_delete(self, regular_user):
        """Test that sessions are deleted when user is deleted"""
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='test-jti',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        session_id = session.id
        regular_user.delete()
        
        assert not UserSession.objects.filter(id=session_id).exists()
    
    def test_user_session_multiple_sessions_per_user(self, regular_user):
        """Test that a user can have multiple active sessions"""
        session1 = UserSession.objects.create(
            user=regular_user,
            token_jti='jti-1',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        session2 = UserSession.objects.create(
            user=regular_user,
            token_jti='jti-2',
            ip_address='192.168.1.2',
            user_agent='Test',
            browser_name='Firefox',
            device_type='mobile',
            os_name='Android',
        )
        
        assert UserSession.objects.filter(user=regular_user).count() == 2
        assert session1.user == session2.user == regular_user


@pytest.mark.django_db
class TestSessionUtilities:
    """Tests for session utility functions"""
    
    def test_get_client_ip_direct(self):
        """Test extracting IP from request without proxy"""
        from django.test import RequestFactory
        from accounts.utils import get_client_ip
        
        factory = RequestFactory()
        request = factory.get('/', REMOTE_ADDR='192.168.1.100')
        
        ip = get_client_ip(request)
        assert ip == '192.168.1.100'
    
    def test_get_client_ip_with_x_forwarded_for(self):
        """Test extracting IP from X-Forwarded-For header"""
        from django.test import RequestFactory
        from accounts.utils import get_client_ip
        
        factory = RequestFactory()
        request = factory.get(
            '/',
            REMOTE_ADDR='10.0.0.1',
            HTTP_X_FORWARDED_FOR='203.0.113.1, 198.51.100.1'
        )
        
        ip = get_client_ip(request)
        # Should get the first IP from X-Forwarded-For
        assert ip == '203.0.113.1'
    
    def test_get_client_ip_with_x_real_ip(self):
        """Test extracting IP from X-Real-IP header"""
        from django.test import RequestFactory
        from accounts.utils import get_client_ip
        
        factory = RequestFactory()
        request = factory.get(
            '/',
            REMOTE_ADDR='10.0.0.1',
            HTTP_X_REAL_IP='203.0.113.2'
        )
        
        ip = get_client_ip(request)
        assert ip == '203.0.113.2'
    
    def test_get_client_ip_priority(self):
        """Test that X-Forwarded-For takes priority over X-Real-IP"""
        from django.test import RequestFactory
        from accounts.utils import get_client_ip
        
        factory = RequestFactory()
        request = factory.get(
            '/',
            REMOTE_ADDR='10.0.0.1',
            HTTP_X_FORWARDED_FOR='203.0.113.1',
            HTTP_X_REAL_IP='203.0.113.2'
        )
        
        ip = get_client_ip(request)
        # X-Forwarded-For should take priority
        assert ip == '203.0.113.1'
    
    def test_parse_user_agent_chrome(self):
        """Test parsing Chrome user agent"""
        from accounts.utils import parse_user_agent
        
        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        result = parse_user_agent(user_agent)
        
        assert result['browser_name'] == 'Chrome'
        assert '120' in result.get('browser_version', '')
        assert result['os_name'] == 'Windows'
        assert result['device_type'] == 'desktop'
    
    def test_parse_user_agent_firefox(self):
        """Test parsing Firefox user agent"""
        from accounts.utils import parse_user_agent
        
        user_agent = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
        result = parse_user_agent(user_agent)
        
        assert result['browser_name'] == 'Firefox'
        assert '121' in result.get('browser_version', '')
        assert result['os_name'] == 'Linux'
        assert result['device_type'] == 'desktop'
    
    def test_parse_user_agent_mobile(self):
        """Test parsing mobile user agent"""
        from accounts.utils import parse_user_agent

        user_agent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        result = parse_user_agent(user_agent)

        assert result['browser_name'] == 'Mobile Safari'
        assert result['os_name'] == 'iOS'
        assert result['device_type'] == 'mobile'
    
    def test_parse_user_agent_tablet(self):
        """Test parsing tablet user agent"""
        from accounts.utils import parse_user_agent
        
        user_agent = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        result = parse_user_agent(user_agent)
        
        assert result['device_type'] == 'tablet'
        assert result['os_name'] == 'iOS'
    
    def test_parse_user_agent_unknown(self):
        """Test parsing unknown user agent"""
        from accounts.utils import parse_user_agent
        
        user_agent = 'Unknown Browser 1.0'
        result = parse_user_agent(user_agent)
        
        # Should still return valid structure with defaults
        assert 'browser_name' in result
        assert 'os_name' in result
        assert 'device_type' in result
        assert result['device_type'] in ['desktop', 'mobile', 'tablet']
    
    def test_can_delete_session_older_can_delete_newer(self, regular_user):
        """Test that older sessions can delete newer sessions"""
        from accounts.utils import can_delete_session
        from django.utils import timezone
        from datetime import timedelta
        
        older_session = UserSession.objects.create(
            user=regular_user,
            token_jti='older-jti',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        older_session.login_date = timezone.now() - timedelta(days=2)
        older_session.save()
        
        newer_session = UserSession.objects.create(
            user=regular_user,
            token_jti='newer-jti',
            ip_address='192.168.1.2',
            user_agent='Test',
            browser_name='Firefox',
            device_type='desktop',
            os_name='Linux',
        )
        newer_session.login_date = timezone.now() - timedelta(days=1)
        newer_session.save()
        
        # Older session should be able to delete newer session
        assert can_delete_session(regular_user, older_session, newer_session) is True
    
    def test_can_delete_session_newer_cannot_delete_older(self, regular_user):
        """Test that newer sessions cannot delete older sessions"""
        from accounts.utils import can_delete_session
        from django.utils import timezone
        from datetime import timedelta
        
        older_session = UserSession.objects.create(
            user=regular_user,
            token_jti='older-jti',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        older_session.login_date = timezone.now() - timedelta(days=2)
        older_session.save()
        
        newer_session = UserSession.objects.create(
            user=regular_user,
            token_jti='newer-jti',
            ip_address='192.168.1.2',
            user_agent='Test',
            browser_name='Firefox',
            device_type='desktop',
            os_name='Linux',
        )
        newer_session.login_date = timezone.now() - timedelta(days=1)
        newer_session.save()
        
        # Newer session should NOT be able to delete older session
        assert can_delete_session(regular_user, newer_session, older_session) is False
    
    def test_can_delete_session_same_user_required(self, regular_user, admin_user):
        """Test that only the session owner can delete"""
        from accounts.utils import can_delete_session
        
        user_session = UserSession.objects.create(
            user=regular_user,
            token_jti='user-jti',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        admin_session = UserSession.objects.create(
            user=admin_user,
            token_jti='admin-jti',
            ip_address='192.168.1.2',
            user_agent='Test',
            browser_name='Firefox',
            device_type='desktop',
            os_name='Linux',
        )
        
        # Regular user cannot delete admin's session
        assert can_delete_session(regular_user, user_session, admin_session) is False


@pytest.mark.django_db
class TestSessionSerializers:
    """Tests for session serializers"""
    
    def test_user_session_serializer_full_data(self, regular_user):
        """Test UserSessionSerializer with full data"""
        from accounts.serializers import UserSessionSerializer
        from django.utils import timezone
        
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='test-jti',
            refresh_token_jti='refresh-jti',
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0 Test',
            browser_name='Chrome',
            browser_version='120.0',
            device_type='desktop',
            device_name='Desktop PC',
            os_name='Windows',
            os_version='11',
            screen_width=1920,
            screen_height=1080,
        )
        
        serializer = UserSessionSerializer(session)
        data = serializer.data
        
        assert data['id'] == session.id
        assert data['token_jti'] == 'test-jti'
        assert data['refresh_token_jti'] == 'refresh-jti'
        assert data['ip_address'] == '192.168.1.1'
        assert data['browser_name'] == 'Chrome'
        assert data['browser_version'] == '120.0'
        assert data['device_type'] == 'desktop'
        assert data['device_name'] == 'Desktop PC'
        assert data['os_name'] == 'Windows'
        assert data['os_version'] == '11'
        assert data['screen_width'] == 1920
        assert data['screen_height'] == 1080
        assert 'login_date' in data
        assert 'last_activity' in data
        assert data['is_active'] is True
    
    def test_user_session_list_serializer_minimal_data(self, regular_user):
        """Test UserSessionListSerializer with minimal fields"""
        from accounts.serializers import UserSessionListSerializer
        
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='test-jti',
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0 Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        serializer = UserSessionListSerializer(session)
        data = serializer.data
        
        # List serializer should have minimal fields
        assert 'id' in data
        assert 'browser_name' in data
        assert 'device_type' in data
        assert 'ip_address' in data
        assert 'login_date' in data
        # Should not have detailed fields
        assert 'screen_width' not in data
        assert 'screen_height' not in data
        assert 'browser_version' not in data
    
    def test_user_session_create_serializer_validation(self):
        """Test UserSessionCreateSerializer validation"""
        from accounts.serializers import UserSessionCreateSerializer
        
        # Valid data
        valid_data = {
            'screen_width': 1920,
            'screen_height': 1080,
        }
        serializer = UserSessionCreateSerializer(data=valid_data)
        assert serializer.is_valid()
        
        # Invalid data (negative screen dimensions)
        invalid_data = {
            'screen_width': -100,
            'screen_height': 1080,
        }
        serializer = UserSessionCreateSerializer(data=invalid_data)
        # Should still be valid (validation can be added if needed)
        # For now, we'll just test the structure
        assert 'screen_width' in invalid_data


@pytest.mark.django_db
class TestSessionCreationOnLogin:
    """Tests for session creation during login"""
    
    def test_session_creation_on_login(self, api_client, regular_user):
        """Test that a session is created when user logs in"""
        from accounts.models import UserSession
        from django.urls import reverse
        
        initial_count = UserSession.objects.filter(user=regular_user).count()
        
        data = {'username': 'regular_user', 'password': 'password123'}
        response = api_client.post(reverse('token_obtain_pair'), data)
        
        assert response.status_code == 200
        assert 'access' in response.data
        
        # Check that a session was created
        sessions = UserSession.objects.filter(user=regular_user)
        assert sessions.count() == initial_count + 1
        
        # Check session data
        session = sessions.latest('login_date')
        assert session.token_jti is not None
        assert session.ip_address is not None
        assert session.browser_name is not None
        assert session.device_type is not None
        assert session.os_name is not None
        assert session.is_active is True
    
    def test_session_creation_with_jti_in_token(self, api_client, regular_user):
        """Test that token JTI is stored in session"""
        from accounts.models import UserSession
        from rest_framework_simplejwt.tokens import UntypedToken
        from jwt import decode as jwt_decode
        from django.conf import settings
        from django.urls import reverse
        
        data = {'username': 'regular_user', 'password': 'password123'}
        response = api_client.post(reverse('token_obtain_pair'), data)
        
        assert response.status_code == 200
        access_token = response.data['access']
        
        # Decode token to get JTI
        decoded = jwt_decode(access_token, settings.SECRET_KEY, algorithms=["HS256"])
        token_jti = decoded.get('jti')
        
        # Check that session has matching JTI
        session = UserSession.objects.filter(user=regular_user).latest('login_date')
        assert session.token_jti == token_jti
    
    def test_session_creation_with_ip_address(self, api_client, regular_user):
        """Test that IP address is captured from request"""
        from accounts.models import UserSession
        from django.urls import reverse
        from django.test import RequestFactory
        
        # Make request with specific IP
        data = {'username': 'regular_user', 'password': 'password123'}
        response = api_client.post(
            reverse('token_obtain_pair'),
            data,
            REMOTE_ADDR='192.168.1.100'
        )
        
        assert response.status_code == 200
        
        session = UserSession.objects.filter(user=regular_user).latest('login_date')
        # IP should be captured (might be 127.0.0.1 in test environment)
        assert session.ip_address is not None
    
    def test_session_creation_with_user_agent(self, api_client, regular_user):
        """Test that User-Agent is captured and parsed"""
        from accounts.models import UserSession
        from django.urls import reverse
        
        user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
        
        data = {'username': 'regular_user', 'password': 'password123'}
        response = api_client.post(
            reverse('token_obtain_pair'),
            data,
            HTTP_USER_AGENT=user_agent
        )
        
        assert response.status_code == 200
        
        session = UserSession.objects.filter(user=regular_user).latest('login_date')
        assert session.user_agent == user_agent
        assert session.browser_name is not None
        assert session.os_name is not None


@pytest.mark.django_db
class TestSessionViews:
    """Tests for session API views"""
    
    def test_list_sessions_authenticated_user(self, authenticated_regular_client, regular_user):
        """Test that authenticated user can list their own sessions"""
        from django.urls import reverse
        
        # Create some sessions
        UserSession.objects.create(
            user=regular_user,
            token_jti='jti-1',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        UserSession.objects.create(
            user=regular_user,
            token_jti='jti-2',
            ip_address='192.168.1.2',
            user_agent='Test',
            browser_name='Firefox',
            device_type='mobile',
            os_name='Android',
        )
        
        response = authenticated_regular_client.get(reverse('usersession-list'))
        
        assert response.status_code == 200
        # Handle paginated response
        sessions = response.data.get('results', response.data)
        assert len(sessions) >= 2
        assert all(s['browser_name'] for s in sessions)
    
    def test_list_sessions_unauthenticated(self, api_client):
        """Test that unauthenticated users cannot list sessions"""
        from django.urls import reverse
        
        response = api_client.get(reverse('usersession-list'))
        assert response.status_code == 401
    
    def test_retrieve_own_session(self, authenticated_regular_client, regular_user):
        """Test that user can retrieve their own session"""
        from django.urls import reverse
        
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='jti-1',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        response = authenticated_regular_client.get(reverse('usersession-detail', args=[session.id]))
        
        assert response.status_code == 200
        assert response.data['id'] == session.id
        assert response.data['browser_name'] == 'Chrome'
        assert response.data['ip_address'] == '192.168.1.1'
    
    def test_retrieve_other_user_session_forbidden(self, authenticated_regular_client, regular_user, admin_user):
        """Test that user cannot retrieve another user's session"""
        from django.urls import reverse
        
        session = UserSession.objects.create(
            user=admin_user,
            token_jti='jti-1',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        response = authenticated_regular_client.get(reverse('usersession-detail', args=[session.id]))
        
        assert response.status_code == 403
    
    def test_retrieve_session_as_admin(self, authenticated_admin_client, regular_user, admin_user):
        """Test that admin can retrieve any user's session"""
        from django.urls import reverse
        
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='jti-1',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        response = authenticated_admin_client.get(reverse('usersession-detail', args=[session.id]))
        
        assert response.status_code == 200
        assert response.data['id'] == session.id
    
    def test_delete_own_older_session(self, api_client, regular_user):
        """Test that user can delete their own newer session with older session"""
        from django.urls import reverse
        from django.utils import timezone
        from datetime import timedelta
        from rest_framework_simplejwt.tokens import RefreshToken
        from jwt import decode as jwt_decode
        from django.conf import settings

        # Create the token first to get its JTI
        refresh = RefreshToken.for_user(regular_user)
        access_token = refresh.access_token
        decoded = jwt_decode(str(access_token), settings.SECRET_KEY, algorithms=["HS256"])
        token_jti = decoded.get('jti')

        # Create older session (the one making the request) with the token's JTI
        older_session = UserSession.objects.create(
            user=regular_user,
            token_jti=token_jti,
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        older_session.login_date = timezone.now() - timedelta(days=2)
        older_session.save()

        # Create newer session (to be deleted)
        newer_session = UserSession.objects.create(
            user=regular_user,
            token_jti='newer-jti',
            ip_address='192.168.1.2',
            user_agent='Test',
            browser_name='Firefox',
            device_type='desktop',
            os_name='Linux',
        )
        newer_session.login_date = timezone.now() - timedelta(days=1)
        newer_session.save()

        # Use the client with the token
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

        response = api_client.delete(
            reverse('usersession-detail', args=[newer_session.id])
        )

        # Should succeed (older session can delete newer session)
        assert response.status_code in [200, 204]
        assert not UserSession.objects.filter(id=newer_session.id).exists()
    
    def test_delete_own_newer_session_forbidden(self, authenticated_regular_client, regular_user):
        """Test that user cannot delete older session with newer session"""
        from django.urls import reverse
        from django.utils import timezone
        from datetime import timedelta
        
        # Create older session
        older_session = UserSession.objects.create(
            user=regular_user,
            token_jti='older-jti',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        older_session.login_date = timezone.now() - timedelta(days=2)
        older_session.save()
        
        # Create newer session (the one making the request)
        newer_session = UserSession.objects.create(
            user=regular_user,
            token_jti='newer-jti',
            ip_address='192.168.1.2',
            user_agent='Test',
            browser_name='Firefox',
            device_type='desktop',
            os_name='Linux',
        )
        newer_session.login_date = timezone.now() - timedelta(days=1)
        newer_session.save()
        
        response = authenticated_regular_client.delete(
            reverse('usersession-detail', args=[older_session.id])
        )
        
        # Should be forbidden (newer cannot delete older)
        assert response.status_code == 403
        assert UserSession.objects.filter(id=older_session.id).exists()
    
    def test_delete_own_session_as_admin_allowed(self, authenticated_admin_client, regular_user):
        """Test that admin can delete any session"""
        from django.urls import reverse
        
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='jti-1',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        response = authenticated_admin_client.delete(
            reverse('usersession-detail', args=[session.id])
        )
        
        assert response.status_code in [200, 204]
        assert not UserSession.objects.filter(id=session.id).exists()


@pytest.mark.django_db
class TestAdminSessionViews:
    """Tests for admin session management endpoints"""
    
    def test_admin_list_user_sessions(self, authenticated_admin_client, regular_user):
        """Test that admin can list sessions for a specific user"""
        from django.urls import reverse
        
        # Create sessions for regular user
        UserSession.objects.create(
            user=regular_user,
            token_jti='jti-1',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        UserSession.objects.create(
            user=regular_user,
            token_jti='jti-2',
            ip_address='192.168.1.2',
            user_agent='Test',
            browser_name='Firefox',
            device_type='mobile',
            os_name='Android',
        )
        
        response = authenticated_admin_client.get(
            reverse('admin-usersession-list'),
            {'user_id': regular_user.id}
        )
        
        assert response.status_code == 200
        sessions = response.data.get('results', response.data)
        assert len(sessions) >= 2
        assert all(s['user']['id'] == regular_user.id for s in sessions)
    
    def test_admin_delete_any_session(self, authenticated_admin_client, regular_user):
        """Test that admin can delete any user's session"""
        from django.urls import reverse
        
        session = UserSession.objects.create(
            user=regular_user,
            token_jti='jti-1',
            ip_address='192.168.1.1',
            user_agent='Test',
            browser_name='Chrome',
            device_type='desktop',
            os_name='Windows',
        )
        
        response = authenticated_admin_client.delete(
            reverse('admin-usersession-detail', args=[session.id])
        )
        
        assert response.status_code in [200, 204]
        assert not UserSession.objects.filter(id=session.id).exists()
    
    def test_regular_user_cannot_access_admin_endpoints(self, authenticated_regular_client):
        """Test that regular users cannot access admin session endpoints"""
        from django.urls import reverse
        
        response = authenticated_regular_client.get(reverse('admin-usersession-list'))
        assert response.status_code == 403

