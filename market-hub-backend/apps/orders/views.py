"""Views for the orders app."""
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.permissions import IsCustomer

from .models import Order
from .permissions import IsOrderParticipant
from .serializers import (
    OrderCreateSerializer,
    OrderSerializer,
    OrderStatusUpdateSerializer,
)
from . import services


@extend_schema(tags=["Orders"])
class OrderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Create and view orders; update status via the dedicated action."""

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "create":
            return OrderCreateSerializer
        if self.action == "set_status":
            return OrderStatusUpdateSerializer
        return OrderSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsCustomer()]
        if self.action in {"retrieve", "set_status"}:
            return [IsAuthenticated(), IsOrderParticipant()]
        return [IsAuthenticated()]

    def get_queryset(self):
        base = (
            Order.objects.select_related("customer")
            .prefetch_related("items__product")
        )
        user = self.request.user
        if not user.is_authenticated:
            return base.none()
        if user.is_admin:
            return base
        if user.is_seller:
            # Orders that include at least one of the seller's products.
            return base.filter(items__product__seller=user).distinct()
        # Customers see their own orders.
        return base.filter(customer=user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = services.create_order(
            customer=request.user,
            items=serializer.validated_data["items"],
        )
        output = OrderSerializer(order, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        request=OrderStatusUpdateSerializer,
        responses=OrderSerializer,
        tags=["Orders"],
    )
    @action(detail=True, methods=["patch"], url_path="status")
    def set_status(self, request, pk=None):
        order = self.get_object()
        serializer = OrderStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        user = request.user
        # Customers may only cancel their own orders.
        if user.is_customer and new_status != Order.Status.CANCELLED:
            raise PermissionDenied("Customers may only cancel their orders.")

        order = services.update_order_status(
            order=order, new_status=new_status, acting_user=user
        )
        return Response(OrderSerializer(order, context=self.get_serializer_context()).data)
