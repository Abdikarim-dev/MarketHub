"""Tests for the products & categories API."""
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.tests.factories import create_admin, create_customer, create_seller
from apps.products.models import Category, Product


class ProductCrudTests(APITestCase):
    def setUp(self):
        self.list_url = reverse("api:products:product-list")
        self.seller = create_seller(username="seller1")
        self.other_seller = create_seller(username="seller2")
        self.customer = create_customer(username="cust1")
        self.admin = create_admin(username="admin1")
        self.category = Category.objects.create(name="Electronics")

    def _payload(self, **overrides):
        data = {
            "category": self.category.id,
            "name": "Laptop",
            "description": "A fast laptop",
            "price": "999.99",
            "stock": 10,
        }
        data.update(overrides)
        return data

    def test_public_can_list_products(self):
        Product.objects.create(
            seller=self.seller, category=self.category, name="Phone",
            price=Decimal("500"), stock=5,
        )
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_seller_can_create_product(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post(self.list_url, self._payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        product = Product.objects.get(name="Laptop")
        self.assertEqual(product.seller, self.seller)
        self.assertEqual(product.stock, 10)

    def test_customer_cannot_create_product(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.list_url, self._payload())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_create_product(self):
        response = self.client.post(self.list_url, self._payload())
        self.assertIn(
            response.status_code,
            {status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN},
        )

    def test_seller_can_update_own_product(self):
        product = Product.objects.create(
            seller=self.seller, category=self.category, name="Old", price=Decimal("10"), stock=1
        )
        self.client.force_authenticate(self.seller)
        url = reverse("api:products:product-detail", args=[product.id])
        response = self.client.patch(url, {"name": "New"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        product.refresh_from_db()
        self.assertEqual(product.name, "New")

    def test_seller_cannot_update_other_sellers_product(self):
        product = Product.objects.create(
            seller=self.other_seller, category=self.category, name="Theirs",
            price=Decimal("10"), stock=1,
        )
        self.client.force_authenticate(self.seller)
        url = reverse("api:products:product-detail", args=[product.id])
        response = self.client.patch(url, {"name": "Hacked"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_seller_can_delete_own_product(self):
        product = Product.objects.create(
            seller=self.seller, category=self.category, name="Del", price=Decimal("10"), stock=1
        )
        self.client.force_authenticate(self.seller)
        url = reverse("api:products:product-detail", args=[product.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=product.id).exists())

    def test_admin_can_update_any_product(self):
        product = Product.objects.create(
            seller=self.other_seller, category=self.category, name="Theirs",
            price=Decimal("10"), stock=1,
        )
        self.client.force_authenticate(self.admin)
        url = reverse("api:products:product-detail", args=[product.id])
        response = self.client.patch(url, {"name": "AdminEdit"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_product_records_inventory_transaction(self):
        self.client.force_authenticate(self.seller)
        self.client.post(self.list_url, self._payload(stock=7))
        product = Product.objects.get(name="Laptop")
        self.assertEqual(product.inventory_transactions.count(), 1)
        txn = product.inventory_transactions.first()
        self.assertEqual(txn.transaction_type, "STOCK_IN")
        self.assertEqual(txn.quantity, 7)


class ProductSearchFilterTests(APITestCase):
    def setUp(self):
        self.list_url = reverse("api:products:product-list")
        self.seller = create_seller(username="seller1")
        self.electronics = Category.objects.create(name="Electronics")
        self.books = Category.objects.create(name="Books")
        Product.objects.create(
            seller=self.seller, category=self.electronics, name="Gaming Laptop",
            price=Decimal("1500"), stock=3,
        )
        Product.objects.create(
            seller=self.seller, category=self.electronics, name="Office Mouse",
            price=Decimal("25"), stock=50,
        )
        Product.objects.create(
            seller=self.seller, category=self.books, name="Django Book",
            price=Decimal("40"), stock=10,
        )

    def test_search(self):
        response = self.client.get(self.list_url, {"search": "laptop"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Gaming Laptop")

    def test_filter_by_category_name(self):
        response = self.client.get(self.list_url, {"category": "books"})
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Django Book")

    def test_filter_by_price_range(self):
        response = self.client.get(self.list_url, {"min_price": "30", "max_price": "100"})
        self.assertEqual(response.data["count"], 1)

    def test_ordering_by_price_desc(self):
        response = self.client.get(self.list_url, {"ordering": "-price"})
        prices = [Decimal(p["price"]) for p in response.data["results"]]
        self.assertEqual(prices, sorted(prices, reverse=True))


class CategoryPermissionTests(APITestCase):
    def setUp(self):
        self.url = reverse("api:products:category-list")
        self.admin = create_admin(username="admin1")
        self.seller = create_seller(username="seller1")

    def test_admin_can_create_category(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.url, {"name": "Toys"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_non_admin_cannot_create_category(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post(self.url, {"name": "Toys"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
