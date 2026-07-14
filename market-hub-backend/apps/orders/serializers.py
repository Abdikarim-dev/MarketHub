"""Serializers for the orders app."""
from rest_framework import serializers

from apps.products.models import Product

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    subtotal = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = OrderItem
        fields = ["id", "product", "product_name", "quantity", "price", "subtotal"]
        read_only_fields = ["id", "price", "subtotal"]


class OrderItemCreateSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    quantity = serializers.IntegerField(min_value=1)


class OrderSerializer(serializers.ModelSerializer):
    """Read serializer returning the full order with its items."""

    items = OrderItemSerializer(many=True, read_only=True)
    customer_username = serializers.CharField(source="customer.username", read_only=True)
    is_paid = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "customer",
            "customer_username",
            "status",
            "total_price",
            "is_paid",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class OrderCreateSerializer(serializers.Serializer):
    """Input serializer for creating an order."""

    items = OrderItemCreateSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value

    def to_representation(self, instance):
        return OrderSerializer(instance, context=self.context).data


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
