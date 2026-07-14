"""Business logic for the products app."""
from django.db import transaction

from .models import Product, ProductImage


@transaction.atomic
def create_product(*, seller, gallery_urls=None, **data):
    """Create a product, optional gallery URLs, and opening stock ledger."""
    gallery_urls = gallery_urls or []
    product = Product.objects.create(seller=seller, **data)

    if gallery_urls:
        ProductImage.objects.bulk_create(
            [
                ProductImage(
                    product=product,
                    url=url,
                    alt_text=f"{product.name} photo {i + 1}",
                    sort_order=i,
                )
                for i, url in enumerate(gallery_urls)
            ]
        )

    if product.stock > 0:
        from apps.inventory.models import InventoryTransaction
        from apps.inventory.services import record_transaction

        record_transaction(
            product=product,
            transaction_type=InventoryTransaction.Type.STOCK_IN,
            quantity=product.stock,
            adjust_stock=False,
        )
    return product
