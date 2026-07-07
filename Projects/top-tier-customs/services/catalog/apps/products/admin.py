from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'sku',
        'product_type',
        'status',
        'price',
        'stock_quantity',
        'is_featured',
        'created_at',
    )

    list_filter = (
        'product_type',
        'status',
        'category',
        'brand',
        'is_featured',
    )

    search_fields = ('name', 'sku', 'category', 'brand')

    prepopulated_fields = {'slug': ('name',)}