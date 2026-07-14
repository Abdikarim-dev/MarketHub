"""Tests for the order workflow."""
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.tests.factories import create_admin, create_customer, create_seller
from apps.orders import services
from apps.orders.models import Order
from apps.products.models import Category, Product
from common.exceptions import ServiceError


class OrderServiceTests(TestCase):
    def setUp(self):
        self.customer = create_customer(username="cust1")
        self.seller = create_seller(username="seller1")
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            seller=self.seller, category=self.category, name="Widget",
            price=Decimal("20.00"), stock=10,
        )

    def test_create_order_reduces_stock_and_totals(self):
        order = services.create_order(
            customer=self.customer,
            items=[{"product": self.product.id, "quantity": 3}],
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 7)
        self.assertEqual(order.total_price, Decimal("60.00"))
        self.assertEqual(order.status, Order.Status.PENDING)

    def test_create_order_insufficient_stock(self):
        with self.assertRaises(ServiceError):
            services.create_order(
                customer=self.customer,
                items=[{"product": self.product.id, "quantity": 999}],
            )
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)

    def test_cancel_order_restores_stock(self):
        order = services.create_order(
            customer=self.customer,
            items=[{"product": self.product.id, "quantity": 4}],
        )
        services.update_order_status(order=order, new_status=Order.Status.CANCELLED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)

    def test_invalid_status_transition_rejected(self):
        order = services.create_order(
            customer=self.customer,
            items=[{"product": self.product.id, "quantity": 1}],
        )
        with self.assertRaises(ServiceError):
            services.update_order_status(order=order, new_status=Order.Status.DELIVERED)


class OrderApiTests(APITestCase):
    def setUp(self):
        self.list_url = reverse("api:orders:order-list")
        self.customer = create_customer(username="cust1")
        self.other_customer = create_customer(username="cust2")
        self.seller = create_seller(username="seller1")
        self.admin = create_admin(username="admin1")
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            seller=self.seller, category=self.category, name="Widget",
            price=Decimal("20.00"), stock=10,
        )

    def test_customer_can_create_order(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(
            self.list_url,
            {"items": [{"product": self.product.id, "quantity": 2}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data["total_price"]), Decimal("40.00"))

    def test_seller_cannot_create_order(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post(
            self.list_url,
            {"items": [{"product": self.product.id, "quantity": 2}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_only_sees_own_orders(self):
        services.create_order(
            customer=self.customer, items=[{"product": self.product.id, "quantity": 1}]
        )
        services.create_order(
            customer=self.other_customer, items=[{"product": self.product.id, "quantity": 1}]
        )
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data["count"], 1)

    def test_customer_can_cancel_own_order(self):
        order = services.create_order(
            customer=self.customer, items=[{"product": self.product.id, "quantity": 1}]
        )
        self.client.force_authenticate(self.customer)
        url = reverse("api:orders:order-set-status", args=[order.id])
        response = self.client.patch(url, {"status": "CANCELLED"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "CANCELLED")

    def test_customer_cannot_advance_status(self):
        order = services.create_order(
            customer=self.customer, items=[{"product": self.product.id, "quantity": 1}]
        )
        self.client.force_authenticate(self.customer)
        url = reverse("api:orders:order-set-status", args=[order.id])
        response = self.client.patch(url, {"status": "SHIPPED"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cannot_advance_unpaid_order(self):
        order = services.create_order(
            customer=self.customer, items=[{"product": self.product.id, "quantity": 1}]
        )
        self.client.force_authenticate(self.admin)
        url = reverse("api:orders:order-set-status", args=[order.id])
        response = self.client.patch(url, {"status": "CONFIRMED"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_advance_paid_order(self):
        from apps.payments import services as payment_services

        order = services.create_order(
            customer=self.customer, items=[{"product": self.product.id, "quantity": 1}]
        )
        payment_services.create_payment_intent(order=order, user=self.customer)
        payment_services.confirm_payment(order=order, user=self.customer)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CONFIRMED)

        self.client.force_authenticate(self.admin)
        url = reverse("api:orders:order-set-status", args=[order.id])
        response = self.client.patch(url, {"status": "PROCESSING"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "PROCESSING")
