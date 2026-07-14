"""Serializers for the reviews app."""
from rest_framework import serializers

from apps.products.models import Product

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "user",
            "user_username",
            "product",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
