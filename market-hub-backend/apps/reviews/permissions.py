"""Permissions for the reviews app."""
from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsCustomerForWrite(BasePermission):
    """Reads are public; only customers may create reviews."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return bool(user and user.is_authenticated and user.is_customer)


class IsReviewAuthorOrAdmin(BasePermission):
    """Only the review's author or an admin may edit/delete it."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.is_admin or obj.user_id == user.id
