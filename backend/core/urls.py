from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers

from .views import ProjectViewSet, TaskViewSet, WorkingDayViewSet, ReportViewSet, FeedbackViewSet

# Main router
router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'working-days', WorkingDayViewSet, basename='working-day')
router.register(r'feedbacks', FeedbackViewSet, basename='feedback')

# Nested router for reports under working-days
working_days_router = routers.NestedDefaultRouter(router, r'working-days', lookup='working_day')
working_days_router.register(r'reports', ReportViewSet, basename='working-day-reports')

urlpatterns = router.urls + working_days_router.urls
