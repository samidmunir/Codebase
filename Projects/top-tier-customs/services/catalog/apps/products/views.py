from rest_framework.viewsets import ModelViewSet
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    
    filterset_fields = [
        'category',
        'brand',
        'product_type',
        'status',
        'is_active',
        'is_featured',
    ]
    
    search_fields = [
        'name', 
        'description', 
        'sku', 
        'category', 
        'brand',
        'material',
        'color',
    ]
    
    ordering_fields = [
        'price',
        'sale_price',
        'created_at', 
        'updated_at', 
        'stock_quantity',
    ]