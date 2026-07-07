from django.db import models

class Product(models.Model):
    class ProductStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        ARCHIVED = 'archived', 'Archived'
        OUT_OF_STOCK = 'out_of_stock', 'Out of Stock'

    class ProductType(models.TextChoices):
        PHYSICAL = 'physical', 'Physical'
        DIGITAL = 'digital', 'Digital'
        CUSTOM = 'custom', 'Custom'

    name = models.CharField(max_length = 150)
    slug = models.SlugField(max_length = 180, unique = True)
    description = models.TextField(blank = True)

    sku = models.CharField(max_length = 80, unique = True)
    product_type = models.CharField(
        max_length = 30,
        choices = ProductType.choices,
        default = ProductType.PHYSICAL,
    )

    status = models.CharField(
        max_length = 30,
        choices = ProductStatus.choices,
        default = ProductStatus.DRAFT,
    )

    price = models.DecimalField(max_digits = 10, decimal_places = 2)
    sale_price = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True)

    category = models.CharField(max_length = 100, blank = True)
    brand = models.CharField(max_length = 100, blank = True)

    stock_quantity = models.PositiveBigIntegerField(default = 0)
    
    is_active = models.BooleanField(default = True)
    is_featured = models.BooleanField(default = False)

    image_url = models.URLField(blank = True)

    material = models.CharField(max_length = 120, blank = True)
    color = models.CharField(max_length = 80, blank = True)
    weight_oz = models.DecimalField(max_digits = 8, decimal_places = 2, null = True, blank = True)

    meta_title = models.CharField(max_length = 180, blank = True)
    meta_description = models.TextField(blank = True)

    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name