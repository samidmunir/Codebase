from rest_framework.routers import DefaultRouter
from .views import ProductPublicViewSet, ProductAdminViewSet

router = DefaultRouter()
router.register(r"products", ProductPublicViewSet, basename="public-product")
router.register(r"admin/products", ProductAdminViewSet, basename="admin-product")

urlpatterns = router.urls