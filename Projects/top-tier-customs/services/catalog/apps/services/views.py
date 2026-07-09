from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import Service
from .serializers import ServiceSerializer


class ServiceViewSet(ModelViewSet):
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

    def get_queryset(self):
        return Service.objects.filter(is_active=True)

    def destroy(self, request, *args, **kwargs):
        service = self.get_object()
        service.is_active = False
        service.status = Service.ServiceStatus.ARCHIVED
        service.is_bookable = False
        service.save(update_fields=["is_active", "status", "is_bookable", "updated_at"])

        return Response(
            {
                "message": "Service archived successfully.",
                "id": service.id,
                "name": service.name,
            },
            status=status.HTTP_200_OK,
        )