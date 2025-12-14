from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from .views import (
    ProjectViewSet, TaskViewSet, WorkingDayViewSet, ReportViewSet, FeedbackViewSet,
    UserViewSet, DomainViewSet, MeetingViewSet,
    statistics_view, organizational_dashboard_view, system_logs_view, settings_view,
    current_user_view
)

# Main router
router = DefaultRouter()
router.register(r'domains', DomainViewSet, basename='domain')
router.register(r'meetings', MeetingViewSet, basename='meeting')  # Admin only
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'working-days', WorkingDayViewSet, basename='working-day')
router.register(r'feedbacks', FeedbackViewSet, basename='feedback')
router.register(r'users', UserViewSet, basename='user')  # Admin only

# Nested router for reports under working-days
working_days_router = routers.NestedDefaultRouter(router, r'working-days', lookup='working_day')
working_days_router.register(r'reports', ReportViewSet, basename='working-day-reports')

urlpatterns = router.urls + working_days_router.urls + [
    path('current-user/', current_user_view, name='current-user'),
    path('admin/statistics/', statistics_view, name='statistics'),
    path('admin/organizational-dashboard/', organizational_dashboard_view, name='organizational-dashboard'),
    path('admin/system-logs/', system_logs_view, name='system-logs'),
    path('admin/settings/', settings_view, name='settings'),
]
