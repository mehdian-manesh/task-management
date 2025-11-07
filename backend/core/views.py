from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Project, Task, WorkingDay, Report, Feedback
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer,
    TaskSerializer, TaskDetailSerializer,
    WorkingDaySerializer,
    ReportSerializer, ReportDetailSerializer,
    FeedbackSerializer
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
