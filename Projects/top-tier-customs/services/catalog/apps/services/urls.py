from rest_framework.routers import DefaultRouter
from .views import ServiceAdminViewSet, ServicePublicViewSet

router = DefaultRouter()

router.register(r"services", ServicePublicViewSet, basename = "public-service")

router.register(r"admin/services", ServiceAdminViewSet, basename = "admin-service")

urlpatterns = router.urls