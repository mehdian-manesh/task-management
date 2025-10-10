from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Project, Task, WorkingDay, Report, Feedback
from .serializers import ProjectSerializer, TaskSerializer, WorkingDaySerializer, ReportSerializer, FeedbackSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:  # Admins see all
            return self.queryset
        return self.queryset.filter(assignees=self.request.user)  # Users see only assigned

    def perform_create(self, serializer):
        if not self.request.user.is_staff:
            return Response({'detail': 'Only admins can create projects.'}, status=status.HTTP_403_FORBIDDEN)
        serializer.save()


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset
        # Users see tasks they created (drafts) or assigned, ensuring project access
        return self.queryset.filter(assignees=self.request.user) | self.queryset.filter(is_draft=True,
                                                                                        assignees=self.request.user)

    def perform_create(self, serializer):
        # Users create drafts; admins approve via PATCH
        if not self.request.user.is_staff:
            serializer.save(is_draft=True, assignees=[self.request.user])
        else:
            serializer.save()


class WorkingDayViewSet(viewsets.ModelViewSet):
    queryset = WorkingDay.objects.all()
    serializer_class = WorkingDaySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)  # Users see only their own

    def perform_create(self, serializer):
        # Creation is check-in; auto-set user and check_in
        serializer.save(user=self.request.user, check_in=timezone.now())

    @action(detail=True, methods=['post'])
    def check_out(self, request, pk=None):
        working_day = self.get_object()
        if working_day.check_out:
            return Response({'detail': 'Already checked out.'}, status=status.HTTP_400_BAD_REQUEST)
        working_day.check_out = timezone.now()
        working_day.save()
        return Response({'detail': 'Checked out successfully.'})

    # TODO: Similar @action for 'leave' if distinct from check-out; define logic accordingly


class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(working_day__user=self.request.user)  # Via WorkingDay ownership

    def perform_create(self, serializer):
        # Ensure task exists; create draft if not (implement logic here or in serializer)
        # For now, assume task ID provided; add auto-draft creation if needed
        serializer.save()


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset
        return self.queryset.filter(user=self.request.user)  # Users see/edit only their own

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# TODO: For nested reports under working-days/<id>/reports/, use routers with nested
#  routing (install drf-nested-routers if needed).

# TODO: For report creation, add logic to auto-create draft tasks if the specified
#  task does not exist. The result field could trigger task status updates via signals or overrides.
