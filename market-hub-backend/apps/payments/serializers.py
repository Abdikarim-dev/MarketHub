"""Serializers for the payments app."""
from rest_framework import serializers

from apps.orders.models import Order

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "amount",
            "currency",
            "status",
            "transaction_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class CreatePaymentIntentSerializer(serializers.Serializer):
    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())


class ConfirmPaymentSerializer(serializers.Serializer):
    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())
    payment_intent_id = serializers.CharField(required=False, allow_blank=True)


class PaymentIntentResponseSerializer(serializers.Serializer):
    client_secret = serializers.CharField()
    payment = PaymentSerializer()
