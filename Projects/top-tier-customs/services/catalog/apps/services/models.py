from django.db import models

class Service(models.Model):
    name = models.CharField(max_length = 150)
    slug = models.SlugField(max_length = 180, unique = True)
    description = models.TextField(blank = True)

    base_price = models.DecimalField(max_digits = 10, decimal_places = 2)
    estimated_duration_minutes = models.PositiveBigIntegerField(default = 60)
    
    category = models.CharField(max_length = 100, blank = True)
    is_active = models.BooleanField(default = True)
    is_featured = models.BooleanField(default = False)

    image_url = models.URLField(blank = True)

    requires_consultation = models.BooleanField(default = False)
    is_bookable = models.BooleanField(default = True)

    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name