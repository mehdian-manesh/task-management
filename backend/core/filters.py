import django_filters
from django.contrib.auth.models import User
from .models import Project, Task, WorkingDay, Report, Feedback, StatusChoices, ReportResultChoices, FeedbackTypeChoices


class ProjectFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    status = django_filters.ChoiceFilter(choices=[(s.value, s.name) for s in StatusChoices])
    start_date = django_filters.DateFilter()
    start_date__gte = django_filters.DateFilter(field_name='start_date', lookup_expr='gte')
    start_date__lte = django_filters.DateFilter(field_name='start_date', lookup_expr='lte')
    deadline = django_filters.DateFilter()
    deadline__gte = django_filters.DateFilter(field_name='deadline', lookup_expr='gte')
    deadline__lte = django_filters.DateFilter(field_name='deadline', lookup_expr='lte')

    class Meta:
        model = Project
        fields = ['name', 'status', 'start_date', 'deadline']


class TaskFilter(django_filters.FilterSet):
    name = django_filters.CharFilter(lookup_expr='icontains')
    status = django_filters.ChoiceFilter(choices=[(s.value, s.name) for s in StatusChoices])
    phase = django_filters.NumberFilter()
    is_draft = django_filters.BooleanFilter()
    project = django_filters.NumberFilter()
    created_by = django_filters.NumberFilter()
    deadline = django_filters.DateFilter()
    deadline__gte = django_filters.DateFilter(field_name='deadline', lookup_expr='gte')
    deadline__lte = django_filters.DateFilter(field_name='deadline', lookup_expr='lte')

    class Meta:
        model = Task
        fields = ['name', 'status', 'phase', 'is_draft', 'project', 'created_by', 'deadline']


class WorkingDayFilter(django_filters.FilterSet):
    user = django_filters.NumberFilter()
    is_on_leave = django_filters.BooleanFilter()
    check_in = django_filters.DateTimeFilter()
    check_in__date = django_filters.DateFilter(field_name='check_in', lookup_expr='date')
    check_in__gte = django_filters.DateTimeFilter(field_name='check_in', lookup_expr='gte')
    check_in__lte = django_filters.DateTimeFilter(field_name='check_in', lookup_expr='lte')
    check_out = django_filters.DateTimeFilter()
    check_out__date = django_filters.DateFilter(field_name='check_out', lookup_expr='date')

    class Meta:
        model = WorkingDay
        fields = ['user', 'is_on_leave', 'check_in', 'check_out']


class ReportFilter(django_filters.FilterSet):
    working_day = django_filters.NumberFilter()
    task = django_filters.NumberFilter()
    result = django_filters.ChoiceFilter(choices=[(r.value, r.name) for r in ReportResultChoices])
    start_time = django_filters.DateTimeFilter()
    start_time__gte = django_filters.DateTimeFilter(field_name='start_time', lookup_expr='gte')
    start_time__lte = django_filters.DateTimeFilter(field_name='start_time', lookup_expr='lte')
    end_time = django_filters.DateTimeFilter()
    end_time__gte = django_filters.DateTimeFilter(field_name='end_time', lookup_expr='gte')
    end_time__lte = django_filters.DateTimeFilter(field_name='end_time', lookup_expr='lte')

    class Meta:
        model = Report
        fields = ['working_day', 'task', 'result', 'start_time', 'end_time']


class FeedbackFilter(django_filters.FilterSet):
    user = django_filters.NumberFilter()
    type = django_filters.ChoiceFilter(choices=[(t.value, t.name) for t in FeedbackTypeChoices])
    created_at = django_filters.DateTimeFilter()
    created_at__gte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at__lte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Feedback
        fields = ['user', 'type', 'created_at']


class UserFilter(django_filters.FilterSet):
    username = django_filters.CharFilter(lookup_expr='icontains')
    email = django_filters.CharFilter(lookup_expr='icontains')
    first_name = django_filters.CharFilter(lookup_expr='icontains')
    last_name = django_filters.CharFilter(lookup_expr='icontains')
    is_staff = django_filters.BooleanFilter()
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active']
