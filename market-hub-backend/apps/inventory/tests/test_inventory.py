"""Tests for inventory transactions and stock adjustments."""
from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.tests.factories import create_seller
from apps.inventory import services
from apps.inventory.models import InventoryTransaction
from apps.products.models import Category, Product
from common.exceptions import InsufficientStockError


class InventoryServiceTests(TestCase):
    def setUp(self):
        self.seller = create_seller(username="seller1")
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            seller=self.seller, category=self.category, name="Widget",
            price=Decimal("10"), stock=10,
        )

    def test_stock_in_increases_stock(self):
        services.stock_in(product=self.product, quantity=5)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 15)

    def test_sale_decreases_stock(self):
        services.register_sale(product=self.product, quantity=4)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 6)

    def test_return_increases_stock(self):
        services.register_return(product=self.product, quantity=3)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 13)

    def test_damage_decreases_stock(self):
        services.register_damage(product=self.product, quantity=2)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

    def test_sale_beyond_stock_is_rejected(self):
        with self.assertRaises(InsufficientStockError):
            services.register_sale(product=self.product, quantity=100)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)

    def test_transaction_is_recorded(self):
        services.stock_in(product=self.product, quantity=5)
        self.assertEqual(
            InventoryTransaction.objects.filter(product=self.product).count(), 1
        )


class InventoryApiTests(APITestCase):
    def setUp(self):
        self.url = "/api/inventory/"
        self.seller = create_seller(username="seller1")
        self.other = create_seller(username="seller2")
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            seller=self.seller, category=self.category, name="Widget",
            price=Decimal("10"), stock=10,
        )

    def test_seller_can_create_stock_in(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post(
            self.url,
            {"product": self.product.id, "transaction_type": "STOCK_IN", "quantity": 5},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 15)

    def test_seller_cannot_manage_other_sellers_inventory(self):
        self.client.force_authenticate(self.other)
        response = self.client.post(
            self.url,
            {"product": self.product.id, "transaction_type": "STOCK_IN", "quantity": 5},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
