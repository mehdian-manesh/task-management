from django.utils import timezone
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Count, Sum, Avg, Q, F
from datetime import timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Project, Task, WorkingDay, Report, Feedback
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer,
    TaskSerializer, TaskDetailSerializer,
    WorkingDaySerializer,
    ReportSerializer, ReportDetailSerializer,
    FeedbackSerializer,
    UserSerializer, UserCreateSerializer, UserUpdateSerializer
)


class IsAdminUserOrReadOnly(permissions.BasePermission):
    """Permission class: Admins can do everything, regular users can only read"""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    permission_classes = [IsAdminUserOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer

    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset.all()
        # Regular users only see projects they're assigned to
        return self.queryset.filter(assignees=self.request.user)

    def create(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {'detail': 'فقط ادمین‌ها می‌توانند پروژه ایجاد کنند.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TaskDetailSerializer
        return TaskSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset.all()
        
        # Regular users see:
        # 1. Tasks they created (including drafts)
        # 2. Tasks they're assigned to
        # 3. Tasks in projects they're assigned to
        from django.db.models import Q
        return self.queryset.filter(
            Q(created_by=user) |
            Q(assignees=user) |
            Q(project__assignees=user)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_staff:
            # Admins can create approved tasks
            serializer.save(created_by=user)
        else:
            # Regular users create draft tasks
            task = serializer.save(created_by=user, is_draft=True)
            # Auto-assign creator to task
            task.assignees.add(user)
            
            # If task has a project, inherit assignees from project
            if task.project:
                for assignee in task.project.assignees.all():
                    task.assignees.add(assignee)


class WorkingDayViewSet(viewsets.ModelViewSet):
    queryset = WorkingDay.objects.all()
    serializer_class = WorkingDaySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset.all()
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Check if user already has an open working day
        open_working_day = WorkingDay.objects.filter(
            user=self.request.user,
            check_out__isnull=True,
            is_on_leave=False
        ).first()
        
        if open_working_day:
            return Response(
                {'detail': 'شما یک روز کاری باز دارید. ابتدا آن را check-out کنید.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def check_out(self, request, pk=None):
        working_day = self.get_object()
        
        if working_day.check_out:
            return Response(
                {'detail': 'قبلاً check-out انجام شده است.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if working_day.is_on_leave:
            return Response(
                {'detail': 'این روز به عنوان مرخصی علامت‌گذاری شده است.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        working_day.check_out = timezone.now()
        working_day.save()
        
        return Response({
            'detail': 'با موفقیت check-out شد.',
            'check_out': working_day.check_out
        })

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Mark working day as leave"""
        working_day = self.get_object()
        
        if working_day.is_on_leave:
            return Response(
                {'detail': 'این روز قبلاً به عنوان مرخصی علامت‌گذاری شده است.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        working_day.is_on_leave = True
        working_day.save()
        
        return Response({
            'detail': 'روز کاری به عنوان مرخصی علامت‌گذاری شد.',
            'is_on_leave': working_day.is_on_leave
        })


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ReportDetailSerializer
        return ReportSerializer

    def get_queryset(self):
        user = self.request.user
        working_day_pk = self.kwargs.get('working_day_pk')
        
        if working_day_pk:
            # Nested under working-days/<id>/reports/
            queryset = self.queryset.filter(working_day_id=working_day_pk)
        else:
            queryset = self.queryset.all()
        
        if user.is_staff:
            return queryset
        
        # Regular users only see their own reports
        return queryset.filter(working_day__user=user)

    def create(self, request, *args, **kwargs):
        working_day_pk = self.kwargs.get('working_day_pk')
        if working_day_pk:
            try:
                working_day = WorkingDay.objects.get(
                    id=working_day_pk,
                    user=request.user
                )
            except WorkingDay.DoesNotExist:
                return Response(
                    {'detail': 'روز کاری یافت نشد.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Add working_day to request data
            request.data['working_day'] = working_day.id
        
        return super().create(request, *args, **kwargs)


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset.all()
        # Regular users only see their own feedback
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def current_user_view(request):
    """Get or update current user information"""
    from .serializers import UserSerializer, UserUpdateSerializer
    
    if request.method == 'GET':
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    elif request.method == 'PATCH':
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True, context={'request': request})
        
        if serializer.is_valid():
            try:
                serializer.save()
                
                # Refresh the user instance to get the latest profile data
                serializer.instance.refresh_from_db()
                if hasattr(serializer.instance, 'profile'):
                    serializer.instance.profile.refresh_from_db()
                
                # Return updated user data with profile picture URL
                user_serializer = UserSerializer(serializer.instance, context={'request': request})
                return Response(user_serializer.data)
            except Exception as e:
                return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Admin-only views
class UserViewSet(viewsets.ModelViewSet):
    """User management - Admin only"""
    queryset = User.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def statistics_view(request):
    """Get system statistics - Admin only"""
    now = timezone.now()
    today = now.date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # User statistics
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    admin_users = User.objects.filter(is_staff=True).count()
    
    # Project statistics
    total_projects = Project.objects.count()
    active_projects = Project.objects.filter(
        status__in=['todo', 'doing', 'test']
    ).count()
    
    # Task statistics
    total_tasks = Task.objects.count()
    draft_tasks = Task.objects.filter(is_draft=True).count()
    tasks_by_status = Task.objects.values('status').annotate(count=Count('id'))
    
    # Working day statistics
    total_working_days = WorkingDay.objects.count()
    today_check_ins = WorkingDay.objects.filter(
        check_in__date=today,
        check_out__isnull=True,
        is_on_leave=False
    ).count()
    
    # Report statistics
    total_reports = Report.objects.count()
    reports_this_week = Report.objects.filter(
        start_time__gte=week_ago
    ).count()
    reports_this_month = Report.objects.filter(
        start_time__gte=month_ago
    ).count()
    
    # Calculate total hours from reports (simplified - count reports with valid times)
    reports_with_times = Report.objects.filter(
        start_time__isnull=False,
        end_time__isnull=False
    ).count()
    
    # Feedback statistics
    total_feedbacks = Feedback.objects.count()
    feedbacks_by_type = Feedback.objects.values('type').annotate(count=Count('id'))
    
    return Response({
        'users': {
            'total': total_users,
            'active': active_users,
            'admins': admin_users,
        },
        'projects': {
            'total': total_projects,
            'active': active_projects,
        },
        'tasks': {
            'total': total_tasks,
            'drafts': draft_tasks,
            'by_status': {item['status']: item['count'] for item in tasks_by_status},
        },
        'working_days': {
            'total': total_working_days,
            'today_check_ins': today_check_ins,
        },
        'reports': {
            'total': total_reports,
            'this_week': reports_this_week,
            'this_month': reports_this_month,
        },
        'feedbacks': {
            'total': total_feedbacks,
            'by_type': {item['type']: item['count'] for item in feedbacks_by_type if item['type']},
        },
    })


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def organizational_dashboard_view(request):
    """Get organizational dashboard data - Admin only"""
    now = timezone.now()
    today = now.date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    # User activity
    active_users_this_week = WorkingDay.objects.filter(
        check_in__gte=week_ago
    ).values('user').distinct().count()
    
    # Project progress
    projects_by_status = Project.objects.values('status').annotate(count=Count('id'))
    
    # Task distribution
    tasks_by_project = Task.objects.values('project__name').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    # User productivity (reports per user)
    user_productivity = Report.objects.filter(
        start_time__gte=month_ago
    ).values('working_day__user__username').annotate(
        report_count=Count('id')
    ).order_by('-report_count')[:10]
    
    # Recent activity
    recent_tasks = Task.objects.order_by('-created_at')[:10]
    recent_projects = Project.objects.order_by('-created_at')[:10]
    
    return Response({
        'user_activity': {
            'active_users_this_week': active_users_this_week,
        },
        'projects': {
            'by_status': {item['status']: item['count'] for item in projects_by_status},
        },
        'tasks': {
            'by_project': [
                {'project': item['project__name'] or 'بدون پروژه', 'count': item['count']}
                for item in tasks_by_project
            ],
        },
        'productivity': [
            {'user': item['working_day__user__username'], 'reports': item['report_count']}
            for item in user_productivity
        ],
        'recent_tasks': TaskSerializer(recent_tasks, many=True).data,
        'recent_projects': ProjectSerializer(recent_projects, many=True).data,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def system_logs_view(request):
    """Get system logs - Admin only (simplified version)"""
    # For now, we'll return recent activity from models
    # In production, you'd want a proper logging system
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    
    recent_tasks = Task.objects.filter(
        created_at__gte=week_ago
    ).order_by('-created_at')[:50]
    
    recent_projects = Project.objects.filter(
        created_at__gte=week_ago
    ).order_by('-created_at')[:50]
    
    recent_working_days = WorkingDay.objects.filter(
        check_in__gte=week_ago
    ).order_by('-check_in')[:50]
    
    logs = []
    
    for task in recent_tasks:
        logs.append({
            'type': 'task_created',
            'message': f'وظیفه "{task.name}" ایجاد شد',
            'user': task.created_by.username if task.created_by else 'سیستم',
            'timestamp': task.created_at,
            'object_id': task.id,
        })
    
    for project in recent_projects:
        logs.append({
            'type': 'project_created',
            'message': f'پروژه "{project.name}" ایجاد شد',
            'user': 'سیستم',
            'timestamp': project.created_at,
            'object_id': project.id,
        })
    
    for wd in recent_working_days:
        logs.append({
            'type': 'check_in',
            'message': f'کاربر {wd.user.username} ورود کرد',
            'user': wd.user.username,
            'timestamp': wd.check_in,
            'object_id': wd.id,
        })
    
    # Sort by timestamp descending
    logs.sort(key=lambda x: x['timestamp'], reverse=True)
    
    return Response({
        'logs': logs[:100],  # Limit to 100 most recent
        'total': len(logs),
    })


@api_view(['GET', 'POST'])
@permission_classes([permissions.IsAdminUser])
def settings_view(request):
    """System settings - Admin only"""
    if request.method == 'GET':
        # Return current settings (you can store these in database or environment)
        return Response({
            'system_name': 'سیستم مدیریت زمان و گزارش کار',
            'timezone': 'Asia/Tehran',
            'allow_user_registration': False,
            'require_email_verification': False,
            'max_working_hours_per_day': 12,
            'min_working_hours_per_day': 0,
        })
    elif request.method == 'POST':
        # Update settings (in production, store in database)
        # For now, just return success
        return Response({
            'message': 'تنظیمات با موفقیت به‌روزرسانی شد',
            'settings': request.data,
        })
