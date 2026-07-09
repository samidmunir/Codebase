from django.db import models


class Product(models.Model):
    class ProductStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"
        OUT_OF_STOCK = "out_of_stock", "Out of Stock"

    class ProductCategory(models.TextChoices):
        WHEELS = "wheels", "Wheels"
        TIRES = "tires", "Tires"
        SUSPENSION = "suspension", "Suspension"
        EXHAUST = "exhaust", "Exhaust"
        PERFORMANCE = "performance", "Performance"
        LIGHTING = "lighting", "Lighting"
        AUDIO = "audio", "Audio"
        EXTERIOR = "exterior", "Exterior"
        INTERIOR = "interior", "Interior"
        DETAILING = "detailing", "Detailing"
        MERCHANDISE = "merchandise", "Merchandise"
        OTHER = "other", "Other"

    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=180, unique=True)
    description = models.TextField(blank=True)

    sku = models.CharField(max_length=80, unique=True)
    category = models.CharField(
        max_length=50,
        choices=ProductCategory.choices,
        default=ProductCategory.OTHER,
    )

    status = models.CharField(
        max_length=30,
        choices=ProductStatus.choices,
        default=ProductStatus.DRAFT,
    )

    brand = models.CharField(max_length=100, blank=True)
    manufacturer_part_number = models.CharField(max_length=120, blank=True)

    price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    stock_quantity = models.PositiveIntegerField(default=0)

    vehicle_make = models.CharField(max_length=80, blank=True)
    vehicle_model = models.CharField(max_length=80, blank=True)
    vehicle_year_start = models.PositiveIntegerField(null=True, blank=True)
    vehicle_year_end = models.PositiveIntegerField(null=True, blank=True)

    fitment_notes = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    image_url = models.URLField(blank=True)

    meta_title = models.CharField(max_length=180, blank=True)
    meta_description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name