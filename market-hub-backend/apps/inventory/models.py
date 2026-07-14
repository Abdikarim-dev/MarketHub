"""Inventory models: an append-only ledger of stock movements."""
from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from apps.products.models import Product


class InventoryTransaction(models.Model):
    """A single stock movement for a product.

    The table acts as an audit ledger: rows are never mutated, only inserted.
    ``Product.stock`` is the running balance kept in sync via the service layer.
    """

    class Type(models.TextChoices):
        STOCK_IN = "STOCK_IN", "Stock In"
        SALE = "SALE", "Sale"
        RETURN = "RETURN", "Return"
        DAMAGE = "DAMAGE", "Damage"

    # Movements that increase available stock.
    INBOUND = {Type.STOCK_IN, Type.RETURN}
    # Movements that decrease available stock.
    OUTBOUND = {Type.SALE, Type.DAMAGE}

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="inventory_transactions",
    )
    transaction_type = models.CharField(max_length=10, choices=Type.choices)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    note = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inventory_transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["product", "transaction_type"])]

    def __str__(self) -> str:
        return f"{self.transaction_type} x{self.quantity} ({self.product_id})"

    @property
    def is_inbound(self) -> bool:
        return self.transaction_type in self.INBOUND
