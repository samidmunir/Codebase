from django.db import models


class Service(models.Model):
    class ServiceStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"
        UNAVAILABLE = "unavailable", "Unavailable"

    class ServiceCategory(models.TextChoices):
        WINDOW_TINT = "window_tint", "Window Tint"
        VINYL_WRAP = "vinyl_wrap", "Vinyl Wrap"
        CERAMIC_COATING = "ceramic_coating", "Ceramic Coating"
        PPF = "paint_protection_film", "Paint Protection Film"
        DETAILING = "detailing", "Detailing"
        WHEEL_TIRE = "wheel_tire", "Wheel & Tire"
        SUSPENSION = "suspension", "Suspension"
        PERFORMANCE = "performance", "Performance"
        AUDIO = "audio", "Audio"
        LIGHTING = "lighting", "Lighting"
        FABRICATION = "fabrication", "Fabrication"
        OTHER = "other", "Other"

    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=180, unique=True)
    description = models.TextField(blank=True)

    category = models.CharField(
        max_length=60,
        choices=ServiceCategory.choices,
        default=ServiceCategory.OTHER,
    )

    status = models.CharField(
        max_length=30,
        choices=ServiceStatus.choices,
        default=ServiceStatus.DRAFT,
    )

    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    starting_at_price = models.BooleanField(default=True)

    estimated_duration_minutes = models.PositiveIntegerField(default=60)

    requires_vehicle_dropoff = models.BooleanField(default=False)
    requires_consultation = models.BooleanField(default=False)
    is_bookable = models.BooleanField(default=True)

    compatible_vehicle_types = models.CharField(
        max_length=255,
        blank=True,
        help_text="Example: coupe, sedan, SUV, truck"
    )

    image_url = models.URLField(blank=True)

    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    meta_title = models.CharField(max_length=180, blank=True)
    meta_description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name