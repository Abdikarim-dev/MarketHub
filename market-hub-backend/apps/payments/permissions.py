"""Permissions for the payments app."""
from rest_framework.permissions import BasePermission


class CanViewPayment(BasePermission):
    """Only the paying customer or an admin may view a payment."""

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.is_admin or obj.order.customer_id == user.id
