"""Views for inventory transactions."""
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, viewsets
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import InventoryTransaction
from .permissions import CanManageInventory
from .serializers import InventoryTransactionSerializer
from . import services


@extend_schema(tags=["Inventory"])
class InventoryTransactionViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Create and list inventory transactions.

    The ledger is append-only, so update/delete are intentionally not exposed.
    Sellers see only their own products' transactions; admins see everything.
    """

    serializer_class = InventoryTransactionSerializer
    permission_classes = [CanManageInventory]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["product", "transaction_type"]
    ordering_fields = ["created_at", "quantity"]

    def get_queryset(self):
        qs = InventoryTransaction.objects.select_related("product", "created_by")
        user = self.request.user
        if user.is_authenticated and not user.is_admin:
            return qs.filter(product__seller=user)
        return qs

    def perform_create(self, serializer):
        data = serializer.validated_data
        txn = services.record_transaction(
            product=data["product"],
            transaction_type=data["transaction_type"],
            quantity=data["quantity"],
            note=data.get("note", ""),
            created_by=self.request.user,
        )
        serializer.instance = txn
