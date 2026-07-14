"""Business logic for Stripe payments.

Design principle: the frontend can *initiate* a payment (create a PaymentIntent)
but a payment is only marked SUCCESS from a signature-verified webhook event.
"""
import logging
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction

from apps.orders.models import Order
from common.exceptions import ServiceError

from .models import Payment

logger = logging.getLogger("markethub")


def _configure_stripe():
    if settings.STRIPE_SECRET_KEY:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        return True
    return False


def _to_minor_units(amount: Decimal) -> int:
    """Convert a decimal amount to the smallest currency unit (e.g. cents)."""
    return int((amount * 100).to_integral_value())


@transaction.atomic
def create_payment_intent(*, order: Order, user):
    """Create (or reuse) a Stripe PaymentIntent for an order and persist a Payment."""
    if order.customer_id != user.id and not user.is_admin:
        raise ServiceError("You can only pay for your own orders.")

    if order.status == Order.Status.CANCELLED:
        raise ServiceError("Cannot pay for a cancelled order.")

    existing = getattr(order, "payment", None)
    if existing and existing.is_successful:
        raise ServiceError("This order has already been paid.")

    if order.total_price <= 0:
        raise ServiceError("Order total must be greater than zero.")

    amount_minor = _to_minor_units(order.total_price)
    stripe_enabled = _configure_stripe()

    # Always mock inside the test suite so tests never call the live Stripe API.
    if getattr(settings, "TESTING", False):
        intent_id = f"pi_mock_{order.pk}"
        client_secret = f"{intent_id}_secret_mock"
    elif stripe_enabled:
        intent = stripe.PaymentIntent.create(
            amount=amount_minor,
            currency=settings.DEFAULT_CURRENCY,
            metadata={"order_id": str(order.pk)},
            automatic_payment_methods={"enabled": True},
        )
        intent_id = intent["id"]
        client_secret = intent["client_secret"]
    else:
        raise ServiceError(
            "Stripe is not configured. Set STRIPE_SECRET_KEY before accepting payments."
        )

    payment, _ = Payment.objects.update_or_create(
        order=order,
        defaults={
            "amount": order.total_price,
            "currency": settings.DEFAULT_CURRENCY,
            "status": Payment.Status.PENDING,
            "transaction_id": intent_id,
        },
    )
    return {"payment": payment, "client_secret": client_secret}


@transaction.atomic
def mark_payment_succeeded(*, transaction_id: str):
    """Mark the payment matching ``transaction_id`` as successful and confirm order."""
    payment = (
        Payment.objects.select_for_update()
        .select_related("order")
        .filter(transaction_id=transaction_id)
        .first()
    )
    if not payment:
        logger.warning("Webhook succeeded for unknown transaction %s", transaction_id)
        return None

    if payment.is_successful:
        return payment

    payment.status = Payment.Status.SUCCESS
    payment.save(update_fields=["status", "updated_at"])

    order = payment.order
    if order.status == Order.Status.PENDING:
        order.status = Order.Status.CONFIRMED
        order.save(update_fields=["status", "updated_at"])
    logger.info("Payment %s succeeded; order #%s confirmed.", transaction_id, order.pk)
    return payment


@transaction.atomic
def mark_payment_failed(*, transaction_id: str):
    payment = (
        Payment.objects.select_for_update()
        .filter(transaction_id=transaction_id)
        .first()
    )
    if not payment:
        return None
    if payment.status != Payment.Status.SUCCESS:
        payment.status = Payment.Status.FAILED
        payment.save(update_fields=["status", "updated_at"])
    return payment


@transaction.atomic
def confirm_payment(*, order: Order, user, payment_intent_id: str | None = None):
    """Verify payment with Stripe (source of truth) then mark the order paid.

    Never trust the frontend alone — this retrieves the PaymentIntent from Stripe
    and only confirms when status is ``succeeded``.
    """
    if order.customer_id != user.id and not user.is_admin:
        raise ServiceError("You can only confirm payment for your own orders.")

    if order.status == Order.Status.CANCELLED:
        raise ServiceError("Cannot pay for a cancelled order.")

    payment = getattr(order, "payment", None)
    if not payment:
        raise ServiceError("No payment has been started for this order.")

    if payment.is_successful:
        return payment

    intent_id = payment_intent_id or payment.transaction_id
    if not intent_id:
        raise ServiceError("Missing payment intent id.")

    # Test-suite mock intents.
    if getattr(settings, "TESTING", False) and str(intent_id).startswith("pi_mock_"):
        return mark_payment_succeeded(transaction_id=intent_id)

    if not _configure_stripe():
        raise ServiceError(
            "Stripe is not configured on the server. Payment cannot be confirmed."
        )

    try:
        intent = stripe.PaymentIntent.retrieve(intent_id)
    except stripe.error.StripeError as exc:
        raise ServiceError(f"Unable to verify payment with Stripe: {exc}") from exc

    meta_order = intent.get("metadata", {}).get("order_id")
    if meta_order and str(meta_order) != str(order.pk):
        raise ServiceError("Payment intent does not belong to this order.")

    status = intent.get("status")
    if status == "succeeded":
        if payment.transaction_id != intent_id:
            payment.transaction_id = intent_id
            payment.save(update_fields=["transaction_id", "updated_at"])
        return mark_payment_succeeded(transaction_id=intent_id)

    if status in {"canceled", "requires_payment_method"}:
        mark_payment_failed(transaction_id=intent_id)
        raise ServiceError(f"Payment was not completed (status: {status}).")

    raise ServiceError(
        f"Payment is still incomplete (status: {status}). Finish paying in the form."
    )


def construct_webhook_event(*, payload: bytes, sig_header: str):
    """Verify and parse a Stripe webhook payload; raises on invalid signature."""
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise ServiceError("Stripe webhook secret is not configured.")
    _configure_stripe()
    try:
        return stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        raise ServiceError("Invalid Stripe webhook signature.") from exc


def process_webhook_event(event: dict):
    """Apply the side effects of a verified Stripe event."""
    event_type = event.get("type")
    obj = event.get("data", {}).get("object", {})
    transaction_id = obj.get("id", "")

    if event_type == "payment_intent.succeeded":
        return mark_payment_succeeded(transaction_id=transaction_id)
    if event_type in {"payment_intent.payment_failed", "payment_intent.canceled"}:
        return mark_payment_failed(transaction_id=transaction_id)

    logger.info("Ignoring unhandled Stripe event type: %s", event_type)
    return None
