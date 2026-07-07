from django.db import models

class Service(models.Model):
    class ServiceStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        ARCHIVED = 'archived', 'Archived'
        UNAVAILABLE = 'unavailable', 'Unavailable'

    class ServiceType(models.TextChoices):
        CUSTOMIZATION = 'customization', 'Customization'
        REPAIR = 'repair', 'Repair'
        CONSULTATION = 'consultation', 'Consultation'
        INSTALLATION = 'installation', 'Installation'

    name = models.CharField(max_length = 150)
    slug = models.SlugField(max_length = 180, unique = True)
    description = models.TextField(blank = True)

    service_type = models.CharField(
        max_length = 40,
        choices = ServiceType.choices,
        default = ServiceType.CUSTOMIZATION,
    )

    status = models.CharField(
        max_length = 30,
        choices = ServiceStatus.choices,
        default = ServiceStatus.DRAFT,
    )

    base_price = models.DecimalField(max_digits = 10, decimal_places = 2)
    estimated_duration_minutes = models.PositiveBigIntegerField(default = 60)
    
    category = models.CharField(max_length = 100, blank = True)
    
    is_active = models.BooleanField(default = True)
    is_featured = models.BooleanField(default = False)

    image_url = models.URLField(blank = True)

    requires_consultation = models.BooleanField(default = False)
    is_bookable = models.BooleanField(default = True)

    meta_title = models.CharField(max_length = 180, blank = True)
    meta_description = models.TextField(blank = True)

    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name