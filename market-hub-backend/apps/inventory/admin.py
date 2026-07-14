"""Admin registration for inventory transactions."""
from django.contrib import admin

from .models import InventoryTransaction


@admin.register(InventoryTransaction)
class InventoryTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "product", "transaction_type", "quantity", "created_by", "created_at")
    list_filter = ("transaction_type", "created_at")
    search_fields = ("product__name",)
    autocomplete_fields = ("product", "created_by")
    readonly_fields = ("created_at",)
