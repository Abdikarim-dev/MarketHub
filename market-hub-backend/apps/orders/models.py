"""Order models."""
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.products.models import Product
from common.models import TimeStampedModel


class Order(TimeStampedModel):
    """A customer's order, composed of one or more :class:`OrderItem`."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PROCESSING = "PROCESSING", "Processing"
        SHIPPED = "SHIPPED", "Shipped"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    # Allowed forward transitions used by the service layer to guard updates.
    TRANSITIONS = {
        Status.PENDING: {Status.CONFIRMED, Status.PROCESSING, Status.CANCELLED},
        Status.CONFIRMED: {Status.PROCESSING, Status.CANCELLED},
        Status.PROCESSING: {Status.SHIPPED, Status.CANCELLED},
        Status.SHIPPED: {Status.DELIVERED},
        Status.DELIVERED: set(),
        Status.CANCELLED: set(),
    }

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
    )

    class Meta(TimeStampedModel.Meta):
        indexes = [models.Index(fields=["customer", "status"])]

    def __str__(self) -> str:
        return f"Order #{self.pk} ({self.status})"

    def recalculate_total(self) -> Decimal:
        total = sum((item.subtotal for item in self.items.all()), Decimal("0.00"))
        self.total_price = total
        return total

    @property
    def is_paid(self) -> bool:
        payment = getattr(self, "payment", None)
        return bool(payment and payment.is_successful)


class OrderItem(models.Model):
    """A single product line within an order, with a price snapshot."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["order", "product"], name="unique_product_per_order"
            )
        ]

    def __str__(self) -> str:
        return f"{self.quantity} x {self.product_id} (order {self.order_id})"

    @property
    def subtotal(self) -> Decimal:
        return self.price * self.quantity
