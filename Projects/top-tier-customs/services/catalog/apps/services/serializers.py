from rest_framework import serializers
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        base_price = attrs.get("base_price", getattr(self.instance, "base_price", None))
        is_bookable = attrs.get("is_bookable", getattr(self.instance, "is_bookable", None))
        status = attrs.get("status", getattr(self.instance, "status", None))

        if base_price is not None and base_price < 0:
            raise serializers.ValidationError({
                "base_price": "Base price cannot be negative."
            })

        if status == "unavailable" and is_bookable:
            raise serializers.ValidationError({
                "is_bookable": "Unavailable services cannot be bookable."
            })

        return attrs