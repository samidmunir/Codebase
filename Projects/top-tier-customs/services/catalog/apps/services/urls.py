from rest_framework.routers import DefaultRouter
from .views import ServicePublicViewSet, ServiceAdminViewSet

router = DefaultRouter()
router.register(r"services", ServicePublicViewSet, basename="public-service")
router.register(r"admin/services", ServiceAdminViewSet, basename="admin-service")

urlpatterns = router.urls