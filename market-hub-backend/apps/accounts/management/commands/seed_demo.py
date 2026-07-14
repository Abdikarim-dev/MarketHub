"""Seed the database with demo users, categories and products.

Usage:
    python manage.py seed_demo
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.products.models import Category
from apps.products.services import create_product

User = get_user_model()


class Command(BaseCommand):
    help = "Create demo users, categories and products for local testing."

    @transaction.atomic
    def handle(self, *args, **options):
        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@markethub.test", "role": User.Role.ADMIN,
                      "is_staff": True, "is_superuser": True},
        )
        admin.set_password("AdminPass123")
        admin.save()

        seller, _ = User.objects.get_or_create(
            username="seller",
            defaults={"email": "seller@markethub.test", "role": User.Role.SELLER},
        )
        seller.set_password("SellerPass123")
        seller.save()

        customer, _ = User.objects.get_or_create(
            username="customer",
            defaults={"email": "customer@markethub.test", "role": User.Role.CUSTOMER},
        )
        customer.set_password("CustomerPass123")
        customer.save()

        electronics, _ = Category.objects.get_or_create(name="Electronics")
        books, _ = Category.objects.get_or_create(name="Books")

        demo_products = [
            (electronics, "Gaming Laptop", Decimal("1499.99"), 15),
            (electronics, "Wireless Mouse", Decimal("29.99"), 200),
            (electronics, "Mechanical Keyboard", Decimal("89.50"), 75),
            (books, "Django for Professionals", Decimal("39.99"), 120),
            (books, "Clean Architecture", Decimal("34.95"), 60),
        ]
        for category, name, price, stock in demo_products:
            if not seller.products.filter(name=name).exists():
                create_product(
                    seller=seller, category=category, name=name,
                    description=f"Demo product: {name}", price=price, stock=stock,
                )

        self.stdout.write(self.style.SUCCESS("Demo data created."))
        self.stdout.write("  admin    / AdminPass123    (role=ADMIN)")
        self.stdout.write("  seller   / SellerPass123   (role=SELLER)")
        self.stdout.write("  customer / CustomerPass123 (role=CUSTOMER)")
