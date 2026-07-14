"""Business logic for the order workflow."""
from decimal import Decimal

from django.db import transaction

from apps.inventory import services as inventory_services
from apps.inventory.models import InventoryTransaction
from apps.products.models import Product
from common.exceptions import ServiceError

from .models import Order, OrderItem


@transaction.atomic
def create_order(*, customer, items):
    """Create an order from a list of ``{"product": id, "quantity": n}`` entries.

    Workflow: validate products -> check inventory -> create order ->
    reduce stock (SALE transactions) -> compute total.
    """
    if not items:
        raise ServiceError("An order must contain at least one item.")

    # Aggregate duplicate product lines so each product appears once.
    # ``product`` may arrive as an id (service call) or a Product instance
    # (DRF PrimaryKeyRelatedField), so normalise to a primary key.
    quantities: dict[int, int] = {}
    for entry in items:
        product = entry["product"]
        product_id = product.pk if hasattr(product, "pk") else int(product)
        qty = int(entry["quantity"])
        if qty <= 0:
            raise ServiceError("Item quantity must be greater than zero.")
        quantities[product_id] = quantities.get(product_id, 0) + qty

    # Lock the involved products to validate & decrement stock atomically.
    products = {
        p.pk: p
        for p in Product.objects.select_for_update().filter(pk__in=quantities.keys())
    }

    missing = set(quantities) - set(products)
    if missing:
        raise ServiceError(f"Product(s) not found: {sorted(missing)}.")

    order = Order.objects.create(customer=customer, status=Order.Status.PENDING)

    total = Decimal("0.00")
    for product_id, qty in quantities.items():
        product = products[product_id]
        if not product.is_active:
            raise ServiceError(f"Product '{product.name}' is not available.")
        if product.stock < qty:
            raise ServiceError(
                f"Insufficient stock for '{product.name}': "
                f"requested {qty}, available {product.stock}."
            )

        OrderItem.objects.create(
            order=order, product=product, quantity=qty, price=product.price
        )
        # Reduce inventory via the ledger (also revalidates & locks).
        inventory_services.register_sale(
            product=product,
            quantity=qty,
            created_by=customer,
            note=f"Order #{order.pk}",
        )
        total += product.price * qty

    order.total_price = total
    order.save(update_fields=["total_price", "updated_at"])
    return order


@transaction.atomic
def update_order_status(*, order, new_status, acting_user=None):
    """Transition an order to ``new_status`` respecting the allowed state machine."""
    order = Order.objects.select_for_update().get(pk=order.pk)
    current = order.status

    if new_status == current:
        return order

    allowed = Order.TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise ServiceError(
            f"Cannot change order status from {current} to {new_status}."
        )

    if new_status == Order.Status.CANCELLED:
        _restore_stock(order, acting_user)

    order.status = new_status
    order.save(update_fields=["status", "updated_at"])
    return order


def _restore_stock(order, acting_user):
    """Return the reserved stock to inventory when an order is cancelled."""
    for item in order.items.select_related("product"):
        inventory_services.record_transaction(
            product=item.product,
            transaction_type=InventoryTransaction.Type.RETURN,
            quantity=item.quantity,
            note=f"Cancellation of order #{order.pk}",
            created_by=acting_user,
        )
