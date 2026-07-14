"""Business logic for the products app."""
from django.db import transaction

from .models import Product


@transaction.atomic
def create_product(*, seller, **data):
    """Create a product and record an opening inventory transaction if stocked."""
    product = Product.objects.create(seller=seller, **data)

    if product.stock > 0:
        # Lazy import avoids a circular dependency between products & inventory.
        from apps.inventory.services import record_transaction
        from apps.inventory.models import InventoryTransaction

        record_transaction(
            product=product,
            transaction_type=InventoryTransaction.Type.STOCK_IN,
            quantity=product.stock,
            adjust_stock=False,  # stock already set on creation
        )
    return product
