from rest_framework.viewsets import ModelViewSet
from .models import Service
from .serializers import ServiceSerializer


class ServiceViewSet(ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer

    filterset_fields = [
        "category",
        "status",
        "is_active",
        "is_featured",
        "is_bookable",
        "requires_consultation",
        "requires_vehicle_dropoff",
    ]

    search_fields = [
        "name",
        "description",
        "category",
        "compatible_vehicle_types",
    ]

    ordering_fields = [
        "base_price",
        "created_at",
        "updated_at",
        "estimated_duration_minutes",
    ]