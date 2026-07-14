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
