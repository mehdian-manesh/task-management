from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User

from accounts.models import UserSession
from accounts.serializers import (
    UserSessionSerializer,
    UserSessionListSerializer,
    AdminUserSessionListSerializer,
    UserSessionCreateSerializer
)
from accounts.utils import can_delete_session
from jwt import decode as jwt_decode
from django.conf import settings


class CanDeleteSessionPermission(permissions.BasePermission):
    """Permission to check if user can delete a session"""
    
    def has_object_permission(self, request, view, obj):
        # Admins can delete any session
        if request.user.is_staff:
            return True
        
        # Users can only delete their own sessions
        if obj.user != request.user:
            return False
        
        # Get current session's JTI from token
        try:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                decoded = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                current_jti = decoded.get('jti')
                
                # Find current session
                try:
                    current_session = UserSession.objects.get(token_jti=current_jti, user=request.user)
                    # Check if current session can delete target session
                    return can_delete_session(request.user, current_session, obj)
                except UserSession.DoesNotExist:
                    return False
        except Exception:
            return False
        
        return False


class UserSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user sessions"""
    permission_classes = [IsAuthenticated]
    serializer_class = UserSessionSerializer

    def get_queryset(self):
        """Return sessions for the current user"""
        return UserSession.objects.filter(user=self.request.user, is_active=True)

    def get_object(self):
        """Get session object - allow any session for permission checking"""
        # Use all sessions instead of filtered queryset for retrieve/update/delete
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            obj = get_object_or_404(UserSession, pk=self.kwargs['pk'])
            self.check_object_permissions(self.request, obj)
            return obj
        # For list, use the filtered queryset
        return super().get_object()

    def get_serializer_class(self):
        if self.action == 'list':
            return UserSessionListSerializer
        return UserSessionSerializer

    def get_permissions(self):
        """Use custom permission for delete action"""
        if self.action == 'destroy':
            return [IsAuthenticated(), CanDeleteSessionPermission()]
        return [IsAuthenticated()]

    def check_object_permissions(self, request, obj):
        """Check permissions for object-level operations"""
        # Check if user owns the session or is admin
        if obj.user != request.user and not request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('شما دسترسی به این جلسه را ندارید.')
    
    def destroy(self, request, *args, **kwargs):
        """Delete session - only if allowed by permission"""
        session = self.get_object()
        
        # Check if user owns the session
        if session.user != request.user and not request.user.is_staff:
            return Response(
                {'detail': 'شما دسترسی به این جلسه را ندارید.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # For non-admin users, check if current session can delete target session
        if not request.user.is_staff:
            try:
                auth_header = request.META.get('HTTP_AUTHORIZATION', '')
                if auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]
                    decoded = jwt_decode(token, settings.SECRET_KEY, algorithms=["HS256"])
                    current_jti = decoded.get('jti')
                    
                    # Find current session
                    try:
                        current_session = UserSession.objects.get(token_jti=current_jti, user=request.user)
                        # Check if current session can delete target session
                        if not can_delete_session(request.user, current_session, session):
                            return Response(
                                {'detail': 'شما نمی‌توانید این جلسه را حذف کنید. فقط جلسات قدیمی‌تر می‌توانند جلسات جدیدتر را حذف کنند.'},
                                status=status.HTTP_403_FORBIDDEN
                            )
                    except UserSession.DoesNotExist:
                        return Response(
                            {'detail': 'جلسه فعلی یافت نشد.'},
                            status=status.HTTP_403_FORBIDDEN
                        )
            except Exception as e:
                return Response(
                    {'detail': 'خطا در بررسی دسترسی.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        session.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'], serializer_class=UserSessionCreateSerializer)
    def update_device_info(self, request, pk=None):
        """Update client-side device information (screen resolution, etc.)"""
        session = self.get_object()
        
        # Check ownership
        if session.user != request.user:
            return Response(
                {'detail': 'شما دسترسی به این جلسه را ندارید.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = UserSessionCreateSerializer(data=request.data)
        if serializer.is_valid():
            screen_width = serializer.validated_data.get('screen_width')
            screen_height = serializer.validated_data.get('screen_height')
            
            if screen_width is not None:
                session.screen_width = screen_width
            if screen_height is not None:
                session.screen_height = screen_height
            
            session.save(update_fields=['screen_width', 'screen_height', 'last_activity'])
            
            return Response(UserSessionSerializer(session).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminUserSessionViewSet(viewsets.ModelViewSet):
    """Admin ViewSet for managing all user sessions"""
    permission_classes = [IsAdminUser]
    serializer_class = UserSessionSerializer
    queryset = UserSession.objects.all()

    def get_queryset(self):
        """Filter by user_id if provided"""
        queryset = super().get_queryset()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return AdminUserSessionListSerializer
        return UserSessionSerializer
