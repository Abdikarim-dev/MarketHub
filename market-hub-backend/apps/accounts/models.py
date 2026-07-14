"""Account models: a custom role-aware User."""
from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """Custom user with a role field driving platform authorization.

    We keep Django's username/password machinery but require a unique email
    and add a ``role`` used throughout the API for authorization.
    """

    class Role(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        SELLER = "SELLER", "Seller"
        ADMIN = "ADMIN", "Admin"

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.CUSTOMER,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.username} ({self.role})"

    @property
    def is_customer(self) -> bool:
        return self.role == self.Role.CUSTOMER

    @property
    def is_seller(self) -> bool:
        return self.role == self.Role.SELLER

    @property
    def is_admin(self) -> bool:
        # A staff/superuser is always treated as an admin.
        return self.role == self.Role.ADMIN or self.is_staff or self.is_superuser
