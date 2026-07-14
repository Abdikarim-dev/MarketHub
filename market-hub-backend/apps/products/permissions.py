"""Permissions for the products app."""
from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsSellerOrAdmin(BasePermission):
    """Only sellers and admins may create/modify products; anyone may read."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and (user.is_seller or user.is_admin))


class IsProductOwnerOrAdmin(BasePermission):
    """Object-level: sellers may only modify their own products; admins any."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_admin:
            return True
        return obj.seller_id == user.id
