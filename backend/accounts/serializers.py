from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from accounts.models import UserSession
from accounts.utils import get_client_ip, parse_user_agent
from jwt import decode as jwt_decode
from django.conf import settings


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['is_staff'] = user.is_staff
        token['username'] = user.username
        
        return token
    
    def validate(self, attrs):
        """Validate credentials and create session"""
        data = super().validate(attrs)
        
        # Get request from context
        request = self.context.get('request')
        if not request:
            return data
        
        user = self.user
        refresh = data.get('refresh')
        access = data.get('access')
        
        # Extract JTI from tokens
        try:
            access_decoded = jwt_decode(access, settings.SECRET_KEY, algorithms=["HS256"])
            token_jti = access_decoded.get('jti')
            
            refresh_jti = None
            if refresh:
                refresh_decoded = jwt_decode(refresh, settings.SECRET_KEY, algorithms=["HS256"])
                refresh_jti = refresh_decoded.get('jti')
        except Exception:
            # If JTI extraction fails, generate a unique identifier
            import uuid
            token_jti = str(uuid.uuid4())
            refresh_jti = str(uuid.uuid4()) if refresh else None
        
        # Get IP address
        ip_address = get_client_ip(request)
        
        # Get and parse User-Agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        parsed_ua = parse_user_agent(user_agent)
        
        # Create session
        UserSession.objects.create(
            user=user,
            token_jti=token_jti,
            refresh_token_jti=refresh_jti,
            ip_address=ip_address,
            user_agent=user_agent,
            browser_name=parsed_ua['browser_name'],
            browser_version=parsed_ua.get('browser_version'),
            device_type=parsed_ua['device_type'],
            device_name=parsed_ua.get('device_name'),
            os_name=parsed_ua['os_name'],
            os_version=parsed_ua.get('os_version'),
        )
        
        return data


class UserSessionSerializer(serializers.ModelSerializer):
    """Full session details serializer"""
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'token_jti', 'refresh_token_jti', 'ip_address', 'user_agent',
            'browser_name', 'browser_version', 'device_type', 'device_name',
            'os_name', 'os_version', 'screen_width', 'screen_height',
            'login_date', 'last_activity', 'is_active'
        ]
        read_only_fields = [
            'id', 'token_jti', 'refresh_token_jti', 'ip_address', 'user_agent',
            'browser_name', 'browser_version', 'device_type', 'device_name',
            'os_name', 'os_version', 'login_date', 'last_activity', 'is_active'
        ]


class UserSessionListSerializer(serializers.ModelSerializer):
    """Minimal session data for list views"""

    class Meta:
        model = UserSession
        fields = [
            'id', 'browser_name', 'device_type', 'device_name',
            'os_name', 'ip_address', 'login_date', 'last_activity', 'is_active'
        ]
        read_only_fields = fields


class AdminUserSessionListSerializer(serializers.ModelSerializer):
    """Session data for admin list views - includes user info"""

    user = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            'id', 'user', 'browser_name', 'device_type', 'device_name',
            'os_name', 'ip_address', 'login_date', 'last_activity', 'is_active'
        ]
        read_only_fields = fields

    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name
        }


class UserSessionCreateSerializer(serializers.Serializer):
    """Serializer for updating client-side device info"""
    screen_width = serializers.IntegerField(required=False, min_value=0)
    screen_height = serializers.IntegerField(required=False, min_value=0)
