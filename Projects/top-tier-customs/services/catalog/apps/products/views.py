from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Product
from .serializers import ProductSerializer


class ProductViewSet(ModelViewSet):
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

    def get_queryset(self):
        return Product.objects.filter(is_active=True)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        product.is_active = False
        product.status = Product.ProductStatus.ARCHIVED
        product.save(update_fields=["is_active", "status", "updated_at"])

        return Response(
            {
                "message": "Product archived successfully.",
                "id": product.id,
                "name": product.name,
            },
            status=status.HTTP_200_OK,
        )