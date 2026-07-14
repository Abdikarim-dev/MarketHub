"""Business logic for inventory management.

All stock mutations must flow through :func:`record_transaction` so the ledger
and the product's running balance stay consistent.
"""
from django.db import transaction
from django.db.models import F

from common.exceptions import InsufficientStockError

from .models import InventoryTransaction


@transaction.atomic
def record_transaction(*, product, transaction_type, quantity, note="", created_by=None,
                       adjust_stock=True):
    """Record a stock movement and update ``product.stock`` accordingly.

    Args:
        adjust_stock: when False the ledger row is written but the product's
            stock is left untouched (used when stock was already set, e.g. on
            initial product creation).
    """
    if quantity <= 0:
        from common.exceptions import ServiceError

        raise ServiceError("Quantity must be a positive integer.")

    # Lock the product row to avoid race conditions on concurrent updates.
    from apps.products.models import Product

    locked = Product.objects.select_for_update().get(pk=product.pk)

    if adjust_stock:
        if transaction_type in InventoryTransaction.OUTBOUND:
            if locked.stock < quantity:
                raise InsufficientStockError(
                    f"Only {locked.stock} unit(s) of '{locked.name}' available."
                )
            Product.objects.filter(pk=locked.pk).update(stock=F("stock") - quantity)
        else:  # INBOUND
            Product.objects.filter(pk=locked.pk).update(stock=F("stock") + quantity)

    txn = InventoryTransaction.objects.create(
        product=locked,
        transaction_type=transaction_type,
        quantity=quantity,
        note=note,
        created_by=created_by,
    )
    return txn


def stock_in(*, product, quantity, created_by=None, note=""):
    return record_transaction(
        product=product,
        transaction_type=InventoryTransaction.Type.STOCK_IN,
        quantity=quantity,
        note=note,
        created_by=created_by,
    )


def register_sale(*, product, quantity, created_by=None, note=""):
    return record_transaction(
        product=product,
        transaction_type=InventoryTransaction.Type.SALE,
        quantity=quantity,
        note=note,
        created_by=created_by,
    )


def register_return(*, product, quantity, created_by=None, note=""):
    return record_transaction(
        product=product,
        transaction_type=InventoryTransaction.Type.RETURN,
        quantity=quantity,
        note=note,
        created_by=created_by,
    )


def register_damage(*, product, quantity, created_by=None, note=""):
    return record_transaction(
        product=product,
        transaction_type=InventoryTransaction.Type.DAMAGE,
        quantity=quantity,
        note=note,
        created_by=created_by,
    )
