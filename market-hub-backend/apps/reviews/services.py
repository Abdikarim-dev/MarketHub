"""Business logic for the reviews app."""
from apps.orders.models import Order, OrderItem
from common.exceptions import ServiceError

from .models import Review


def has_purchased(*, user, product) -> bool:
    """Return True if the user has an order (not cancelled) containing the product."""
    return OrderItem.objects.filter(
        order__customer=user,
        product=product,
    ).exclude(order__status=Order.Status.CANCELLED).exists()


def create_review(*, user, product, rating, comment=""):
    """Create a review after enforcing the purchase and duplicate rules."""
    if not has_purchased(user=user, product=product):
        raise ServiceError("You can only review products you have purchased.")

    if Review.objects.filter(user=user, product=product).exists():
        raise ServiceError("You have already reviewed this product.")

    return Review.objects.create(
        user=user, product=product, rating=rating, comment=comment
    )
