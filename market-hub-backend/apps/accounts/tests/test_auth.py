"""Tests for authentication and profile endpoints."""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .factories import create_customer

User = get_user_model()


class RegistrationTests(APITestCase):
    def setUp(self):
        self.url = reverse("api:accounts:register")

    def test_register_customer_success(self):
        payload = {
            "username": "alice",
            "email": "alice@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "role": "CUSTOMER",
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], "CUSTOMER")
        self.assertNotIn("password", response.data)
        self.assertTrue(User.objects.filter(username="alice").exists())

    def test_password_is_hashed(self):
        payload = {
            "username": "bob",
            "email": "bob@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
        }
        self.client.post(self.url, payload)
        user = User.objects.get(username="bob")
        self.assertNotEqual(user.password, "StrongPass123")
        self.assertTrue(user.check_password("StrongPass123"))

    def test_register_password_mismatch(self):
        payload = {
            "username": "carol",
            "email": "carol@example.com",
            "password": "StrongPass123",
            "password_confirm": "Mismatch123",
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_weak_password_rejected(self):
        payload = {
            "username": "dave",
            "email": "dave@example.com",
            "password": "123",
            "password_confirm": "123",
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_email_rejected(self):
        create_customer(username="existing", email="dup@example.com")
        payload = {
            "username": "newuser",
            "email": "dup@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
        }
        response = self.client.post(self.url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_self_register_as_admin(self):
        payload = {
            "username": "sneaky",
            "email": "sneaky@example.com",
            "password": "StrongPass123",
            "password_confirm": "StrongPass123",
            "role": "ADMIN",
        }
        response = self.client.post(self.url, payload)
        # ADMIN is not an allowed choice for registration.
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):
    def setUp(self):
        self.url = reverse("api:accounts:login")
        self.user = create_customer(username="login_user", password="StrongPass123")

    def test_login_success_returns_tokens(self):
        response = self.client.post(
            self.url, {"username": "login_user", "password": "StrongPass123"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["username"], "login_user")

    def test_login_invalid_credentials(self):
        response = self.client.post(
            self.url, {"username": "login_user", "password": "WrongPass"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTests(APITestCase):
    def setUp(self):
        self.url = reverse("api:accounts:profile")
        self.user = create_customer(username="me", password="StrongPass123")

    def test_profile_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_view_profile(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "me")

    def test_jwt_authentication_flow(self):
        login = self.client.post(
            reverse("api:accounts:login"),
            {"username": "me", "password": "StrongPass123"},
        )
        token = login.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_token_refresh(self):
        login = self.client.post(
            reverse("api:accounts:login"),
            {"username": "me", "password": "StrongPass123"},
        )
        refresh = login.data["refresh"]
        response = self.client.post(
            reverse("api:accounts:token_refresh"), {"refresh": refresh}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
