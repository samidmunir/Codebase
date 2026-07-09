from django.contrib import admin
from .models import Service


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "status",
        "base_price",
        "estimated_duration_minutes",
        "is_bookable",
        "is_featured",
        "created_at",
    )

    list_filter = (
        "category",
        "status",
        "is_bookable",
        "requires_consultation",
        "requires_vehicle_dropoff",
        "is_featured",
    )

    search_fields = (
        "name",
        "category",
        "compatible_vehicle_types",
    )

    prepopulated_fields = {
        "slug": ("name",)
    }