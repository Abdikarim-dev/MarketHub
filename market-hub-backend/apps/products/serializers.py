"""Serializers for the products app."""
from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source="products.count", read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "product_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]


class ProductSerializer(serializers.ModelSerializer):
    """Read/write serializer for products.

    ``seller`` is assigned automatically from the authenticated user and is
    never accepted from the client.
    """

    seller = serializers.PrimaryKeyRelatedField(read_only=True)
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "seller",
            "seller_username",
            "category",
            "category_name",
            "name",
            "description",
            "price",
            "stock",
            "image",
            "is_active",
            "in_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "seller", "created_at", "updated_at"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value
