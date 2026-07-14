"""Payment models."""
from django.core.validators import MinValueValidator
from django.db import models

from apps.orders.models import Order


class Payment(models.Model):
    """A payment attached to an order.

    Payment status is only ever advanced to SUCCESS by a verified Stripe webhook
    event, never by trusting the client.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="payment"
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )
    currency = models.CharField(max_length=3, default="usd")
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    transaction_id = models.CharField(max_length=255, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Payment for order #{self.order_id} ({self.status})"

    @property
    def is_successful(self) -> bool:
        return self.status == self.Status.SUCCESS
