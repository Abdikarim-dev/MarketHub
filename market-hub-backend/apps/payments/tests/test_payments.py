"""Tests for the payments app (Stripe integration is mocked)."""
from decimal import Decimal
from unittest import mock

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.tests.factories import create_customer, create_seller
from apps.orders import services as order_services
from apps.orders.models import Order
from apps.payments import services
from apps.payments.models import Payment
from apps.products.models import Category, Product


def _order_for(customer, seller):
    category = Category.objects.create(name="Electronics")
    product = Product.objects.create(
        seller=seller, category=category, name="Widget",
        price=Decimal("50.00"), stock=10,
    )
    return order_services.create_order(
        customer=customer, items=[{"product": product.id, "quantity": 2}]
    )


class PaymentServiceTests(TestCase):
    def setUp(self):
        self.customer = create_customer(username="cust1")
        self.seller = create_seller(username="seller1")
        self.order = _order_for(self.customer, self.seller)

    def test_create_payment_intent_creates_pending_payment(self):
        result = services.create_payment_intent(order=self.order, user=self.customer)
        payment = result["payment"]
        self.assertEqual(payment.status, Payment.Status.PENDING)
        self.assertEqual(payment.amount, Decimal("100.00"))
        self.assertTrue(result["client_secret"])

    def test_cannot_pay_for_another_users_order(self):
        intruder = create_customer(username="intruder")
        with self.assertRaises(Exception):
            services.create_payment_intent(order=self.order, user=intruder)

    def test_webhook_success_confirms_order(self):
        services.create_payment_intent(order=self.order, user=self.customer)
        event = {
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": f"pi_mock_{self.order.pk}"}},
        }
        services.process_webhook_event(event)

        payment = Payment.objects.get(order=self.order)
        self.order.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.SUCCESS)
        self.assertEqual(self.order.status, Order.Status.CONFIRMED)

    def test_webhook_failure_marks_payment_failed(self):
        services.create_payment_intent(order=self.order, user=self.customer)
        event = {
            "type": "payment_intent.payment_failed",
            "data": {"object": {"id": f"pi_mock_{self.order.pk}"}},
        }
        services.process_webhook_event(event)
        payment = Payment.objects.get(order=self.order)
        self.assertEqual(payment.status, Payment.Status.FAILED)


class PaymentApiTests(APITestCase):
    def setUp(self):
        self.customer = create_customer(username="cust1")
        self.seller = create_seller(username="seller1")
        self.order = _order_for(self.customer, self.seller)

    def test_create_intent_endpoint(self):
        self.client.force_authenticate(self.customer)
        url = reverse("api:payments:payment-create-intent")
        response = self.client.post(url, {"order": self.order.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("client_secret", response.data)

    def test_webhook_rejects_invalid_signature(self):
        # No STRIPE_WEBHOOK_SECRET configured -> construct_event raises -> 400.
        url = reverse("api:payments:stripe-webhook")
        response = self.client.post(url, data=b"{}", content_type="application/json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_webhook_processes_verified_event(self):
        services.create_payment_intent(order=self.order, user=self.customer)
        url = reverse("api:payments:stripe-webhook")
        fake_event = {
            "type": "payment_intent.succeeded",
            "data": {"object": {"id": f"pi_mock_{self.order.pk}"}},
        }
        with mock.patch(
            "apps.payments.views.services.construct_webhook_event",
            return_value=fake_event,
        ):
            response = self.client.post(
                url, data=b"{}", content_type="application/json",
                HTTP_STRIPE_SIGNATURE="test",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.CONFIRMED)
