"""Product catalog models."""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify

from common.models import TimeStampedModel


class Category(TimeStampedModel):
    """A product category (e.g. Electronics, Books)."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True)

    class Meta(TimeStampedModel.Meta):
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(TimeStampedModel):
    """A product listed by a seller."""

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    name = models.CharField(max_length=255, db_index=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )
    stock = models.PositiveIntegerField(default=0)
    # Optional local/Cloudinary upload (sellers who upload files).
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta(TimeStampedModel.Meta):
        indexes = [
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["seller"]),
        ]

    def __str__(self) -> str:
        return self.name

    @property
    def in_stock(self) -> bool:
        return self.stock > 0

    @property
    def primary_image_url(self) -> str | None:
        gallery = list(self.gallery.all()[:1])
        if gallery:
            return gallery[0].url
        if self.image:
            return self.image.url
        return None


class ProductImage(models.Model):
    """Remote image URL for a product gallery (3+ recommended)."""

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="gallery",
    )
    url = models.URLField(max_length=500)
    alt_text = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return f"Image {self.sort_order} for product {self.product_id}"
