"""Review models."""
from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.products.models import Product
from common.models import TimeStampedModel


class Review(TimeStampedModel):
    """A product review left by a customer who purchased the product."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)

    class Meta(TimeStampedModel.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["user", "product"], name="unique_review_per_user_product"
            )
        ]
        indexes = [models.Index(fields=["product", "rating"])]

    def __str__(self) -> str:
        return f"{self.rating}★ by {self.user_id} on {self.product_id}"
