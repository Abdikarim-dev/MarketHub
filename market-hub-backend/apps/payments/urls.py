"""Payment URL routes."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PaymentViewSet, StripeWebhookView

app_name = "payments"

router = DefaultRouter()
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("payments/webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
    # Conventional alias so the endpoint can also be reached at the more
    # common /api/webhooks/stripe/ path.
    path("webhooks/stripe/", StripeWebhookView.as_view(), name="stripe-webhook-alias"),
] + router.urls
