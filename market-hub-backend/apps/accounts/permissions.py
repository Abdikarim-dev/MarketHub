"""Accounts-specific permissions (re-exported from common for convenience)."""
from common.permissions import IsAdmin, IsCustomer, IsSeller  # noqa: F401


class IsSelfOrAdmin:
    """Object-level style check used by profile-related views if needed."""

    # Kept intentionally simple; profile endpoints operate on request.user.
