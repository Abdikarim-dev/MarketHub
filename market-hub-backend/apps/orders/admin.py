"""Admin registration for orders."""
from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    autocomplete_fields = ("product",)
    readonly_fields = ("price",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "status", "total_price", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("customer__username", "id")
    inlines = [OrderItemInline]
    readonly_fields = ("total_price", "created_at", "updated_at")
