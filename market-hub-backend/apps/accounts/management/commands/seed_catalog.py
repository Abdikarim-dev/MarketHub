"""Seed a full marketplace catalog: 1 admin, 10 sellers, 5 customers, 500 products.

Each product gets at least 3 remote gallery images (picsum.photos seeds).

Usage:
    python manage.py seed_catalog
    python manage.py seed_catalog --reset
"""
from __future__ import annotations

from decimal import Decimal
from itertools import cycle

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.inventory.models import InventoryTransaction
from apps.products.models import Category, Product, ProductImage

User = get_user_model()

CATEGORIES = [
    ("Electronics", "Phones, laptops, audio and gadgets"),
    ("Fashion", "Clothing, shoes and accessories"),
    ("Home & Kitchen", "Furniture, cookware and décor"),
    ("Beauty", "Skincare, makeup and wellness"),
    ("Sports", "Fitness gear and outdoor equipment"),
    ("Books", "Print and digital reading"),
    ("Groceries", "Pantry staples and fresh goods"),
    ("Toys", "Kids toys and games"),
    ("Automotive", "Car care and accessories"),
    ("Garden", "Outdoor plants and tools"),
]

# Catalog building blocks — combined + indexed to guarantee unique names.
BRANDS = [
    "Aero", "Nova", "Pulse", "Orbit", "Lumen", "Vista", "Summit", "Ridge",
    "Harbor", "Copper", "Jade", "Amber", "Slate", "Coral", "Maple", "Cedar",
    "North", "Pacific", "Atlas", "Beacon", "Forge", "Glyph", "Helix", "Ion",
    "Kinetic",
]
LINES = [
    "Pro", "Lite", "Max", "Air", "Edge", "Prime", "Ultra", "Plus", "Core",
    "Studio", "Home", "Sport", "City", "Travel", "Everyday", "Signature",
]
ITEMS = [
    "Headphones", "Speaker", "Smartwatch", "Laptop Sleeve", "Backpack",
    "Running Shoes", "Hoodie", "Desk Lamp", "Coffee Maker", "Skincare Set",
    "Yoga Mat", "Cookbook", "Organic Tea", "Board Game", "Car Charger",
    "Garden Shears", "Bluetooth Earbuds", "Mechanical Keyboard", "Monitor Stand",
    "Water Bottle", "Leather Wallet", "Cotton Tee", "Ceramic Mug", "Face Serum",
    "Dumbbell Set", "Notebook", "Granola Pack", "Action Figure", "Phone Mount",
    "Plant Pot", "Webcam", "Power Bank", "Tablet Case", "Sneakers", "Jacket",
    "Air Fryer", "Perfume", "Resistance Bands", "Novel", "Snack Box",
    "Puzzle", "Tire Gauge", "Solar Light", "SSD Drive", "Mouse Pad",
]

SELLER_PROFILES = [
    ("seller01", "Amina", "Hassan", "TechNest Store"),
    ("seller02", "Omar", "Ali", "Urban Outfit Hub"),
    ("seller03", "Fatima", "Nur", "HomeCraft Co"),
    ("seller04", "Yusuf", "Abdi", "Glow Beauty Lab"),
    ("seller05", "Hodan", "Salad", "Peak Sports Gear"),
    ("seller06", "Ibrahim", "Jama", "PageTurner Books"),
    ("seller07", "Maryam", "Warsame", "FreshBasket Mart"),
    ("seller08", "Khalid", "Osman", "PlayZone Toys"),
    ("seller09", "Sahra", "Farah", "AutoGuard Parts"),
    ("seller10", "Abdi", "Mohamed", "GreenLeaf Garden"),
]

CUSTOMERS = [
    ("customer01", "Layla", "Ahmed"),
    ("customer02", "Daniel", "Bekele"),
    ("customer03", "Noura", "Ismail"),
    ("customer04", "Samir", "Khan"),
    ("customer05", "Hana", "Yusuf"),
]


def gallery_urls(index: int, name: str) -> list[str]:
    """Three distinct remote photos per product (stable seeds, no API key)."""
    return [
        f"https://picsum.photos/seed/mh-{index}-a/800/800",
        f"https://picsum.photos/seed/mh-{index}-b/800/800",
        f"https://picsum.photos/seed/mh-{index}-c/800/800",
    ]


def build_catalog_names(count: int = 500) -> list[str]:
    names: list[str] = []
    n = 0
    for brand in BRANDS:
        for line in LINES:
            for item in ITEMS:
                n += 1
                names.append(f"{brand} {line} {item}")
                if len(names) >= count:
                    return names
    # Fallback uniqueness if combos somehow run out.
    while len(names) < count:
        names.append(f"MarketHub Exclusive Item {len(names) + 1}")
    return names


class Command(BaseCommand):
    help = "Seed 1 admin, 10 sellers, 5 customers and 500 products with galleries."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing catalog products/images before seeding.",
        )
        parser.add_argument(
            "--count",
            type=int,
            default=500,
            help="Number of products to create (default 500).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        count = options["count"]
        if options["reset"]:
            InventoryTransaction.objects.all().delete()
            ProductImage.objects.all().delete()
            Product.objects.all().delete()
            self.stdout.write("Cleared existing products, images and inventory.")

        # --- Admin ---
        admin, _ = User.objects.update_or_create(
            username="admin",
            defaults={
                "email": "admin@markethub.test",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Platform",
                "last_name": "Admin",
            },
        )
        admin.set_password("AdminPass123")
        admin.save()

        # --- Sellers ---
        sellers: list[User] = []
        for username, first, last, store in SELLER_PROFILES:
            user, _ = User.objects.update_or_create(
                username=username,
                defaults={
                    "email": f"{username}@markethub.test",
                    "role": User.Role.SELLER,
                    "first_name": first,
                    "last_name": last,
                    "is_staff": False,
                    "is_superuser": False,
                },
            )
            user.set_password("SellerPass123")
            user.save()
            sellers.append(user)

        seller_store = {username: store for username, _, _, store in SELLER_PROFILES}
        for username, first, last in CUSTOMERS:
            user, _ = User.objects.update_or_create(
                username=username,
                defaults={
                    "email": f"{username}@markethub.test",
                    "role": User.Role.CUSTOMER,
                    "first_name": first,
                    "last_name": last,
                    "is_staff": False,
                    "is_superuser": False,
                },
            )
            user.set_password("CustomerPass123")
            user.save()

        # --- Categories ---
        categories: list[Category] = []
        for name, description in CATEGORIES:
            cat, _ = Category.objects.get_or_create(
                name=name, defaults={"description": description}
            )
            categories.append(cat)

        existing = Product.objects.count()
        if existing >= count and not options["reset"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Already have {existing} products. Use --reset to rebuild."
                )
            )
            self._print_credentials()
            return

        names = build_catalog_names(count)
        seller_cycle = cycle(sellers)
        category_cycle = cycle(categories)

        products_to_create: list[Product] = []
        for i, name in enumerate(names):
            seller = next(seller_cycle)
            category = next(category_cycle)
            # Varied prices / stock by index.
            price = Decimal(((i % 97) + 8) * 3 + (i % 7) * 0.25).quantize(Decimal("0.01"))
            stock = 10 + (i % 90)
            products_to_create.append(
                Product(
                    seller=seller,
                    category=category,
                    name=name,
                    description=(
                        f"{name} offered by {seller_store[seller.username]}. "
                        f"Premium {category.name.lower()} pick with multi-angle photos."
                    ),
                    price=price,
                    stock=stock,
                    is_active=True,
                )
            )

        # bulk_create in batches
        created: list[Product] = []
        batch_size = 100
        for start in range(0, len(products_to_create), batch_size):
            batch = products_to_create[start : start + batch_size]
            created.extend(Product.objects.bulk_create(batch))

        # Re-fetch with IDs (SQLite/Postgres bulk_create returns PKs on modern Django)
        if not created[0].pk:
            created = list(
                Product.objects.filter(name__in=names).order_by("id")[:count]
            )

        images: list[ProductImage] = []
        inventory: list[InventoryTransaction] = []
        for i, product in enumerate(created):
            for order, url in enumerate(gallery_urls(i + 1, product.name)):
                images.append(
                    ProductImage(
                        product=product,
                        url=url,
                        alt_text=f"{product.name} — view {order + 1}",
                        sort_order=order,
                    )
                )
            if product.stock:
                inventory.append(
                    InventoryTransaction(
                        product=product,
                        transaction_type=InventoryTransaction.Type.STOCK_IN,
                        quantity=product.stock,
                        note="Initial catalog seed",
                    )
                )

        ProductImage.objects.bulk_create(images, batch_size=300)
        InventoryTransaction.objects.bulk_create(inventory, batch_size=200)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(created)} products with {len(images)} gallery images "
                f"across {len(sellers)} sellers."
            )
        )
        self._print_credentials()

    def _print_credentials(self):
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=== Demo credentials ==="))
        self.stdout.write("ADMIN")
        self.stdout.write("  admin / AdminPass123")
        self.stdout.write("SELLERS (password for all: SellerPass123)")
        for username, first, last, store in SELLER_PROFILES:
            self.stdout.write(f"  {username} / SellerPass123  ({store} — {first} {last})")
        self.stdout.write("CUSTOMERS (password for all: CustomerPass123)")
        for username, first, last in CUSTOMERS:
            self.stdout.write(f"  {username} / CustomerPass123  ({first} {last})")
