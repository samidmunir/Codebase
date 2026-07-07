from django.contrib import admin
from .models import Service

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'service_type',
        'status',
        'base_price',
        'estimated_duration_minutes',
        'is_bookable',
        'is_featured',
        'created_at',
    )

    list_filter = (
        'service_type',
        'status',
        'category',
        'is_bookable',
        'is_featured',
    )

    search_fields = ('name', 'category', 'service_type')

    prepopulated_fields = {'slug': ('name',)}