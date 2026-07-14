"""Reusable role-based DRF permissions.

These are the building blocks used by the per-app ``permissions.py`` modules so
authorization rules stay consistent across the platform.
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdmin(BasePermission):
    """Allow access only to authenticated admin users."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin)


class IsSeller(BasePermission):
    """Allow access only to authenticated sellers."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_seller)


class IsCustomer(BasePermission):
    """Allow access only to authenticated customers."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_customer)


class IsAdminOrReadOnly(BasePermission):
    """Read for anyone; write only for admins."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin)
