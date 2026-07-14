"""Views for the payments app."""
import logging

from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.exceptions import ServiceError

from .models import Payment
from .permissions import CanViewPayment
from .serializers import (
    ConfirmPaymentSerializer,
    CreatePaymentIntentSerializer,
    PaymentIntentResponseSerializer,
    PaymentSerializer,
)
from . import services

logger = logging.getLogger("markethub")


@extend_schema(tags=["Payments"])
class PaymentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """List/retrieve payments and create a Stripe PaymentIntent."""

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, CanViewPayment]

    def get_queryset(self):
        qs = Payment.objects.select_related("order", "order__customer")
        user = self.request.user
        if user.is_authenticated and not user.is_admin:
            return qs.filter(order__customer=user)
        return qs

    @extend_schema(
        request=CreatePaymentIntentSerializer,
        responses=PaymentIntentResponseSerializer,
    )
    @action(detail=False, methods=["post"], url_path="create-intent")
    def create_intent(self, request):
        serializer = CreatePaymentIntentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.validated_data["order"]

        result = services.create_payment_intent(order=order, user=request.user)
        payload = {
            "client_secret": result["client_secret"],
            "payment": PaymentSerializer(result["payment"]).data,
        }
        return Response(payload, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=ConfirmPaymentSerializer,
        responses=PaymentSerializer,
    )
    @action(detail=False, methods=["post"], url_path="confirm")
    def confirm(self, request):
        """Confirm payment only after Stripe reports the intent as succeeded."""
        serializer = ConfirmPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = services.confirm_payment(
            order=serializer.validated_data["order"],
            user=request.user,
            payment_intent_id=serializer.validated_data.get("payment_intent_id") or None,
        )
        return Response(PaymentSerializer(payment).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Payments"], request=None, responses={200: None})
class StripeWebhookView(APIView):
    """Receive and verify Stripe webhook events.

    This endpoint is intentionally unauthenticated (Stripe calls it) but every
    request is validated against the signing secret before any side effects.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
        try:
            event = services.construct_webhook_event(
                payload=payload, sig_header=sig_header
            )
        except ServiceError as exc:
            logger.warning("Rejected Stripe webhook: %s", exc)
            return Response({"detail": str(exc.detail)}, status=status.HTTP_400_BAD_REQUEST)

        services.process_webhook_event(event)
        return Response({"received": True}, status=status.HTTP_200_OK)
