from rest_framework.viewsets import ModelViewSet
from models import Product
from serializers import ProductSerializer

class ProductViewSet(ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filterset_fields = ['category', 'brand', 'is_active', 'is_featured']
    search_fields = ['name', 'description', 'sku', 'category', 'brand']
    ordering_fields = ['price', 'created_at', 'updated_at', 'stock_quantity']