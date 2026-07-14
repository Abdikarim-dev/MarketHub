"""Permissions for the orders app."""
from rest_framework.permissions import BasePermission


class IsOrderParticipant(BasePermission):
    """Object-level access to an order.

    - Admins: full access.
    - Customers: only their own orders.
    - Sellers: orders that contain one of their products (read).
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_admin:
            return True
        if obj.customer_id == user.id:
            return True
        if user.is_seller:
            return obj.items.filter(product__seller=user).exists()
        return False
