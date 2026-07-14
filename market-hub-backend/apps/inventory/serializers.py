"""Serializers for inventory transactions."""
from rest_framework import serializers

from apps.products.models import Product

from .models import InventoryTransaction


class InventoryTransactionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = [
            "id",
            "product",
            "product_name",
            "transaction_type",
            "quantity",
            "note",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value

    def validate_product(self, product):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and not user.is_admin and product.seller_id != user.id:
            raise serializers.ValidationError(
                "You can only manage inventory for your own products."
            )
        return product
