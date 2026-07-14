"""Tests for the reviews app."""
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.tests.factories import create_customer, create_seller
from apps.orders import services as order_services
from apps.products.models import Category, Product
from apps.reviews.models import Review


class ReviewApiTests(APITestCase):
    def setUp(self):
        self.url = reverse("api:reviews:review-list")
        self.customer = create_customer(username="cust1")
        self.non_buyer = create_customer(username="cust2")
        self.seller = create_seller(username="seller1")
        self.category = Category.objects.create(name="Electronics")
        self.product = Product.objects.create(
            seller=self.seller, category=self.category, name="Widget",
            price=Decimal("20"), stock=10,
        )
        # Give the customer a purchase history for the product.
        order_services.create_order(
            customer=self.customer, items=[{"product": self.product.id, "quantity": 1}]
        )

    def test_purchaser_can_review(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(
            self.url, {"product": self.product.id, "rating": 5, "comment": "Great!"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Review.objects.count(), 1)

    def test_non_purchaser_cannot_review(self):
        self.client.force_authenticate(self.non_buyer)
        response = self.client.post(
            self.url, {"product": self.product.id, "rating": 4}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_review(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post(
            self.url, {"product": self.product.id, "rating": 4}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_review_rejected(self):
        self.client.force_authenticate(self.customer)
        self.client.post(self.url, {"product": self.product.id, "rating": 5})
        response = self.client.post(self.url, {"product": self.product.id, "rating": 3})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_rating_rejected(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(
            self.url, {"product": self.product.id, "rating": 9}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reviews_are_publicly_listable(self):
        Review.objects.create(user=self.customer, product=self.product, rating=5)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
