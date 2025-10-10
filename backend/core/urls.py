from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, TaskViewSet, WorkingDayViewSet, ReportViewSet, FeedbackViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'working-days', WorkingDayViewSet)
router.register(r'feedbacks', FeedbackViewSet)
# For reports, potentially nest under working-days; for simplicity, register separately
router.register(r'working-days/(?P<working_day_pk>\d+)/reports', ReportViewSet, basename='working-day-reports')

urlpatterns = router.urls
