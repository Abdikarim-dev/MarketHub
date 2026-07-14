"""Permissions for the inventory app."""
from rest_framework.permissions import BasePermission


class CanManageInventory(BasePermission):
    """Only sellers (for their own products) and admins may manage inventory."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_seller or user.is_admin))

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_admin:
            return True
        # ``obj`` is an InventoryTransaction; check the owning product's seller.
        return obj.product.seller_id == user.id
