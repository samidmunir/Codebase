from rest_framework.viewsets import ModelViewSet
from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    filterset_fields = [
        "category",
        "brand",
        "status",
        "is_active",
        "is_featured",
        "vehicle_make",
        "vehicle_model",
    ]

    search_fields = [
        "name",
        "description",
        "sku",
        "brand",
        "manufacturer_part_number",
        "vehicle_make",
        "vehicle_model",
        "fitment_notes",
    ]

    ordering_fields = [
        "price",
        "sale_price",
        "created_at",
        "updated_at",
        "stock_quantity",
    ]