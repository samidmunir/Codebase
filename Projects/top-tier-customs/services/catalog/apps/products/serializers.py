from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        sale_price = attrs.get("sale_price", getattr(self.instance, "sale_price", None))

        year_start = attrs.get("vehicle_year_start", getattr(self.instance, "vehicle_year_start", None))
        year_end = attrs.get("vehicle_year_end", getattr(self.instance, "vehicle_year_end", None))

        if sale_price is not None and price is not None and sale_price >= price:
            raise serializers.ValidationError({
                "sale_price": "Sale price must be less than the regular price."
            })

        if year_start and year_end and year_start > year_end:
            raise serializers.ValidationError({
                "vehicle_year_end": "Vehicle year end must be greater than or equal to vehicle year start."
            })

        return attrs