from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "sku",
        "category",
        "brand",
        "status",
        "price",
        "stock_quantity",
        "is_featured",
        "created_at",
    )

    list_filter = (
        "category",
        "status",
        "brand",
        "is_featured",
        "is_active",
    )

    search_fields = (
        "name",
        "sku",
        "brand",
        "manufacturer_part_number",
        "vehicle_make",
        "vehicle_model",
    )

    prepopulated_fields = {
        "slug": ("name",)
    }