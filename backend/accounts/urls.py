from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accounts.views import UserSessionViewSet, AdminUserSessionViewSet

router = DefaultRouter()
router.register(r'sessions', UserSessionViewSet, basename='usersession')
router.register(r'admin/sessions', AdminUserSessionViewSet, basename='admin-usersession')

urlpatterns = [
    path('', include(router.urls)),
]

