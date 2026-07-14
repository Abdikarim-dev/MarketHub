"""Admin registration for payments."""
from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "amount", "currency", "status", "transaction_id", "created_at")
    list_filter = ("status", "currency", "created_at")
    search_fields = ("transaction_id", "order__id")
    readonly_fields = ("created_at", "updated_at")
