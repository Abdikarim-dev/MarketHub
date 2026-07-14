"""Shared helpers for building test users."""
from django.contrib.auth import get_user_model

User = get_user_model()


def create_user(username="user", email=None, password="StrongPass123", role=None, **extra):
    email = email or f"{username}@example.com"
    role = role or User.Role.CUSTOMER
    return User.objects.create_user(
        username=username, email=email, password=password, role=role, **extra
    )


def create_customer(username="customer", **kwargs):
    return create_user(username=username, role=User.Role.CUSTOMER, **kwargs)


def create_seller(username="seller", **kwargs):
    return create_user(username=username, role=User.Role.SELLER, **kwargs)


def create_admin(username="admin", **kwargs):
    return create_user(username=username, role=User.Role.ADMIN, is_staff=True, **kwargs)
