from django.utils import timezone
from django.contrib.auth.models import User
from django.db import models
from django.db.models import Count, Sum, Avg, Q, F
from datetime import timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Project, Task, WorkingDay, Report, Feedback, Domain, Meeting, ReportNote, SavedReport
from django.utils import timezone as tz
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer,
    TaskSerializer, TaskDetailSerializer,
    WorkingDaySerializer,
    ReportSerializer, ReportDetailSerializer,
    FeedbackSerializer,
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    DomainSerializer, DomainTreeSerializer,
    MeetingSerializer, MeetingDetailSerializer,
    ReportNoteSerializer, SavedReportSerializer
)
from .report_service import ReportService
from .pdf_service import generate_report_pdf
from django.http import HttpResponse
from .domain_utils import filter_by_domain, user_can_access_domain, user_can_access_entity
from .filters import ProjectFilter, TaskFilter, WorkingDayFilter, ReportFilter, FeedbackFilter, UserFilter


class IsAdminUserOrReadOnly(permissions.BasePermission):
    """Permission class: Admins can do everything, regular users can only read"""
    def has_permission(self, request, view):
        # Require authentication for all operations
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    permission_classes = [IsAdminUserOrReadOnly]
    filterset_class = ProjectFilter
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'status', 'start_date', 'deadline', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer

    def get_queryset(self):
        queryset = self.queryset.all()
        if not self.request.user.is_staff:
            # Regular users only see projects they're assigned to
            queryset = queryset.filter(assignees=self.request.user)
        # Apply domain filtering
        queryset = filter_by_domain(queryset, self.request.user, 'domain')
        return queryset

    def create(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(
                {'detail': 'فقط ادمین‌ها می‌توانند پروژه ایجاد کنند.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Auto-assign domain from user if not provided"""
        from .domain_utils import get_user_domain
        project = serializer.save()
        # If no domain specified, use user's domain
        if not project.domain:
            user_domain = get_user_domain(self.request.user)
            if user_domain:
                project.domain = user_domain
                project.save(update_fields=['domain'])
        return project


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = TaskFilter
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'status', 'phase', 'deadline', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'list']:
            return TaskDetailSerializer
        return TaskSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset.all()
        if not user.is_staff:
            # Regular users see:
            # 1. Tasks they created (including drafts)
            # 2. Tasks they're assigned to
            # 3. Tasks in projects they're assigned to
            from django.db.models import Q
            queryset = queryset.filter(
                Q(created_by=user) |
                Q(assignees=user) |
                Q(project__assignees=user)
            ).distinct()
        # Apply domain filtering
        queryset = filter_by_domain(queryset, user, 'domain')
        return queryset


    def perform_create(self, serializer):
        from .domain_utils import get_user_domain
        user = self.request.user
        if user.is_staff:
            # Admins can create approved tasks
            task = serializer.save(created_by=user)
        else:
            # Regular users create draft tasks
            task = serializer.save(created_by=user, is_draft=True)
            # Auto-assign creator to task
            task.assignees.add(user)
            
            # If task has a project, inherit assignees from project
            if task.project:
                for assignee in task.project.assignees.all():
                    task.assignees.add(assignee)
        
        # Auto-assign domain if not set
        # Task.save() will auto-assign from project, but if no project, use user's domain
        if not task.domain:
            user_domain = get_user_domain(user)
            if user_domain:
                task.domain = user_domain
                task.save(update_fields=['domain'])


class WorkingDayViewSet(viewsets.ModelViewSet):
    queryset = WorkingDay.objects.all()
    serializer_class = WorkingDaySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = WorkingDayFilter
    ordering_fields = ['check_in', 'check_out', 'is_on_leave']
    ordering = ['-check_in']

    def get_queryset(self):
        queryset = self.queryset.all()
        if not self.request.user.is_staff:
            queryset = queryset.filter(user=self.request.user)
        return queryset

    def create(self, request, *args, **kwargs):
        # Check if user already has an open working day
        open_working_day = WorkingDay.objects.filter(
            user=request.user,
            check_out__isnull=True,
            is_on_leave=False
        ).first()
        
        if open_working_day:
            return Response(
                {'detail': 'شما یک روز کاری باز دارید. ابتدا آن را check-out کنید.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
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
    filterset_class = ReportFilter
    ordering_fields = ['result', 'start_time', 'end_time']
    ordering = ['-start_time']

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
        
        if not user.is_staff:
            # Regular users only see their own reports
            queryset = queryset.filter(working_day__user=user)
        
        # Optimize queries by selecting related task
        queryset = queryset.select_related('task')
        
        return queryset

    def list(self, request, *args, **kwargs):
        """Override list to check working_day access for nested routes"""
        working_day_pk = self.kwargs.get('working_day_pk')
        if working_day_pk:
            try:
                working_day = WorkingDay.objects.get(id=working_day_pk)
                if not request.user.is_staff and working_day.user != request.user:
                    return Response(
                        {'detail': 'روز کاری یافت نشد.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            except WorkingDay.DoesNotExist:
                return Response(
                    {'detail': 'روز کاری یافت نشد.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        return super().list(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        working_day_pk = self.kwargs.get('working_day_pk')
        if working_day_pk:
            try:
                # Get working day without user filter (admins can access any)
                # Follow same pattern as list() method - get first, then check access
                working_day = WorkingDay.objects.get(id=working_day_pk)
                
                # Check access: admin can access any, regular users only their own
                # This matches the pattern in list() method above
                if not request.user.is_staff and working_day.user != request.user:
                    return Response(
                        {'detail': 'روز کاری یافت نشد.'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            except WorkingDay.DoesNotExist:
                return Response(
                    {'detail': 'روز کاری یافت نشد.'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Make a mutable copy of request.data and add working_day
            data = request.data.copy()
            data['working_day'] = working_day.id
            
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        
        return super().create(request, *args, **kwargs)


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = FeedbackFilter
    search_fields = ['description']
    ordering_fields = ['type', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = self.queryset.all()
        if not self.request.user.is_staff:
            # Regular users only see their own feedback
            queryset = queryset.filter(user=self.request.user)
        return queryset

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
class DomainViewSet(viewsets.ModelViewSet):
    """ViewSet for managing organizational structure domains"""
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
    permission_classes = [permissions.IsAdminUser]
    ordering = ['path']
    
    def get_serializer_class(self):
        if self.action == 'tree':
            return DomainTreeSerializer
        return DomainSerializer
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get the full domain tree structure"""
        root_domains = Domain.objects.filter(parent__isnull=True)
        serializer = DomainTreeSerializer(root_domains, many=True, context={'request': request})
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """Create domain and auto-generate path"""
        domain = serializer.save()
        # Path is auto-generated in save() method
        return domain
    
    def perform_update(self, serializer):
        """Update domain - if parent changes, path will be updated"""
        domain = serializer.save()
        return domain
    
    def perform_destroy(self, instance):
        """Handle domain deletion with protected foreign key checks"""
        from django.db.models.deletion import ProtectedError
        try:
            instance.delete()
        except ProtectedError as e:
            from rest_framework.exceptions import ValidationError
            protected_objects = []
            for obj in e.protected_objects:
                if hasattr(obj, '__class__'):
                    protected_objects.append(f"{obj.__class__.__name__}: {obj}")
            raise ValidationError(
                f"نمی‌توان این دامنه را حذف کرد زیرا به {len(e.protected_objects)} مورد مرتبط است. "
                f"لطفاً ابتدا موارد مرتبط را حذف یا تغییر دهید."
            )


class UserViewSet(viewsets.ModelViewSet):
    """User management - Admin only"""
    queryset = User.objects.all()
    permission_classes = [permissions.IsAdminUser]
    filterset_class = UserFilter
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'first_name', 'last_name', 'date_joined', 'last_login']
    ordering = ['-date_joined']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def perform_update(self, serializer):
        """Handle domain update in user profile"""
        user = serializer.save()
        # Domain is updated via UserProfile, handled in UserUpdateSerializer
        return user


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def statistics_view(request):
    """Get system statistics - Admin only"""
    now = timezone.now()
    today = now.date()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

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
    # Use date range instead of check_in__date for better timezone handling
    from datetime import datetime as dt
    today_start = timezone.make_aware(dt.combine(today, dt.min.time()))
    today_end = timezone.make_aware(dt.combine(today, dt.max.time())) + timedelta(days=1)
    today_check_ins = WorkingDay.objects.filter(
        check_in__gte=today_start,
        check_in__lt=today_end,
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
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

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
    
    # Employee "doing" tasks - only tasks with status "doing" for each employee
    from .models import StatusChoices
    active_users = User.objects.filter(is_active=True)
    employee_tasks = []
    
    for user in active_users:
        # Get only "doing" tasks
        doing_tasks = Task.objects.filter(
            assignees=user,
            status=StatusChoices.DOING.value
        ).order_by('-updated_at')
        
        if doing_tasks.exists():
            employee_tasks.append({
                'user_id': user.id,
                'username': user.username,
                'first_name': user.first_name or '',
                'last_name': user.last_name or '',
                'full_name': f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username,
                'tasks': TaskDetailSerializer(doing_tasks, many=True).data,
                'task_count': doing_tasks.count(),
            })
    
    # Sort by task count (descending) then by username
    employee_tasks.sort(key=lambda x: (-x['task_count'], x['username']))
    
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
        'employee_tasks': employee_tasks,
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


class MeetingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing meetings - Admin only for create/update/delete, all users can view"""
    queryset = Meeting.objects.all()
    serializer_class = MeetingSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering = ['datetime']  # Ascending for future meetings
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return MeetingDetailSerializer
        return MeetingSerializer
    
    def get_permissions(self):
        """Only admins can create, update, or delete meetings"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        """All authenticated users can view meetings"""
        from django.utils.dateparse import parse_datetime
        
        queryset = Meeting.objects.all()
        
        # Optional filtering by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from:
            parsed_date_from = parse_datetime(date_from)
            if parsed_date_from:
                # Make timezone-aware if naive
                if tz.is_naive(parsed_date_from):
                    parsed_date_from = tz.make_aware(parsed_date_from)
                queryset = queryset.filter(datetime__gte=parsed_date_from)
        if date_to:
            parsed_date_to = parse_datetime(date_to)
            if parsed_date_to:
                # Make timezone-aware if naive
                if tz.is_naive(parsed_date_to):
                    parsed_date_to = tz.make_aware(parsed_date_to)
                queryset = queryset.filter(datetime__lte=parsed_date_to)
        
        return queryset.select_related('created_by').prefetch_related('participants', 'external_participants')
    
    @action(detail=False, methods=['get'], url_path='next-meetings', url_name='next-meetings')
    def next_meetings(self, request):
        """
        Get next 3 upcoming meetings (scheduled meetings, not logs).
        This endpoint aggregates all meetings and their next occurrences.
        """
        from datetime import timedelta
        try:
            from dateutil.relativedelta import relativedelta
        except ImportError:
            # Fallback if dateutil is not available
            def relativedelta(months=0, years=0):
                days = (months * 30) + (years * 365)
                return timedelta(days=days)
        
        now = tz.now()
        all_meetings = Meeting.objects.all().select_related('created_by').prefetch_related('participants', 'external_participants')
        
        # Collect all next occurrences from all meetings
        all_occurrences = []
        
        for meeting in all_meetings:
            occurrences = meeting.get_next_occurrences(count=10)  # Get more to ensure we have enough
            for occ_datetime in occurrences:
                if occ_datetime > now:  # Only future occurrences
                    all_occurrences.append({
                        'meeting': meeting,
                        'datetime': occ_datetime
                    })
        
        # Sort by datetime and take first 3
        all_occurrences.sort(key=lambda x: x['datetime'])
        next_3 = all_occurrences[:3]
        
        # Serialize the results
        serializer = self.get_serializer_class()
        result = []
        for item in next_3:
            meeting_data = serializer(item['meeting'], context={'request': request}).data
            meeting_data['occurrence_datetime'] = item['datetime'].isoformat()
            result.append(meeting_data)
        
        return Response(result)


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


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def generate_individual_report_view(request):
    """Generate individual report for the authenticated user"""
    period_type = request.query_params.get('period_type')
    year = request.query_params.get('year')
    month = request.query_params.get('month')
    day = request.query_params.get('day')
    week = request.query_params.get('week')
    
    if not period_type or not year:
        return Response(
            {'detail': 'period_type and year are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        year = int(year)
        month = int(month) if month else None
        day = int(day) if day else None
        week = int(week) if week else None
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Invalid date parameters'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        report_data = ReportService.generate_individual_report(
            request.user, period_type, year, month=month, day=day, week=week
        )
        return Response(report_data)
    except ValueError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def generate_team_report_view(request):
    """Generate team report for a domain (admin only)"""
    domain_id = request.query_params.get('domain_id')
    period_type = request.query_params.get('period_type')
    year = request.query_params.get('year')
    month = request.query_params.get('month')
    week = request.query_params.get('week')
    
    if not domain_id or not period_type or not year:
        return Response(
            {'detail': 'domain_id, period_type, and year are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        domain = Domain.objects.get(id=domain_id)
        year = int(year)
        month = int(month) if month else None
        week = int(week) if week else None
    except Domain.DoesNotExist:
        return Response(
            {'detail': 'Domain not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Invalid date parameters'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        report_data = ReportService.generate_team_report(
            domain, period_type, year, month=month, week=week
        )
        return Response(report_data)
    except ValueError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def export_individual_report_pdf_view(request):
    """Export individual report as PDF"""
    period_type = request.query_params.get('period_type')
    year = request.query_params.get('year')
    month = request.query_params.get('month')
    day = request.query_params.get('day')
    week = request.query_params.get('week')
    
    if not period_type or not year:
        return Response(
            {'detail': 'period_type and year are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        year = int(year)
        month = int(month) if month else None
        day = int(day) if day else None
        week = int(week) if week else None
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Invalid date parameters'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        report_data = ReportService.generate_individual_report(
            request.user, period_type, year, month=month, day=day, week=week
        )
        pdf_file = generate_report_pdf(report_data, report_type='individual')
        
        from .jalali_utils import format_jalali_period
        period_str = format_jalali_period(period_type, year, month=month, week=week, day=day)
        filename = f"report_individual_{period_str.replace(' ', '_')}.pdf"
        
        response = HttpResponse(pdf_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except ValueError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def export_team_report_pdf_view(request):
    """Export team report as PDF (admin only)"""
    domain_id = request.query_params.get('domain_id')
    period_type = request.query_params.get('period_type')
    year = request.query_params.get('year')
    month = request.query_params.get('month')
    week = request.query_params.get('week')
    
    if not domain_id or not period_type or not year:
        return Response(
            {'detail': 'domain_id, period_type, and year are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        domain = Domain.objects.get(id=domain_id)
        year = int(year)
        month = int(month) if month else None
        week = int(week) if week else None
    except Domain.DoesNotExist:
        return Response(
            {'detail': 'Domain not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Invalid date parameters'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        report_data = ReportService.generate_team_report(
            domain, period_type, year, month=month, week=week
        )
        pdf_file = generate_report_pdf(report_data, report_type='team')
        
        from .jalali_utils import format_jalali_period
        period_str = format_jalali_period(period_type, year, month=month, week=week)
        filename = f"report_team_{domain.name}_{period_str.replace(' ', '_')}.pdf"
        
        response = HttpResponse(pdf_file.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except ValueError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


class ReportNoteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing report notes (admin only)"""
    queryset = ReportNote.objects.all()
    serializer_class = ReportNoteSerializer
    permission_classes = [permissions.IsAdminUser]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SavedReportViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing saved reports"""
    queryset = SavedReport.objects.all()
    serializer_class = SavedReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        if not self.request.user.is_staff:
            # Regular users can only see their own individual reports
            queryset = queryset.filter(report_type='individual', user=self.request.user)
        return queryset
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download saved report PDF"""
        saved_report = self.get_object()
        
        if saved_report.pdf_file:
            response = HttpResponse(saved_report.pdf_file.read(), content_type='application/pdf')
            filename = f"saved_report_{saved_report.id}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        else:
            return Response(
                {'detail': 'PDF file not available'},
                status=status.HTTP_404_NOT_FOUND
            )