"""Filtering for product listings."""
import django_filters as filters
from django.db.models import Q

from .models import Product


class ProductFilter(filters.FilterSet):
    """Supports filtering by category (name/slug or id) and price range."""

    category = filters.CharFilter(method="filter_category")
    min_price = filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = filters.NumberFilter(field_name="price", lookup_expr="lte")
    seller = filters.NumberFilter(field_name="seller_id")
    in_stock = filters.BooleanFilter(method="filter_in_stock")

    class Meta:
        model = Product
        fields = ["category", "seller", "min_price", "max_price", "in_stock"]

    def filter_category(self, queryset, name, value):
        if value.isdigit():
            return queryset.filter(category_id=int(value))
        return queryset.filter(
            Q(category__slug__iexact=value) | Q(category__name__iexact=value)
        )

    def filter_in_stock(self, queryset, name, value):
        return queryset.filter(stock__gt=0) if value else queryset.filter(stock=0)
