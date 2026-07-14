"""Views for categories and products."""
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from common.permissions import IsAdminOrReadOnly

from .filters import ProductFilter
from .models import Category, Product
from .permissions import IsProductOwnerOrAdmin, IsSellerOrAdmin
from .serializers import CategorySerializer, ProductSerializer
from . import services


@extend_schema(tags=["Categories"])
class CategoryViewSet(viewsets.ModelViewSet):
    """CRUD for categories. Read is public; writes are admin-only."""

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]
    lookup_field = "pk"


@extend_schema(tags=["Products"])
class ProductViewSet(viewsets.ModelViewSet):
    """CRUD for products with search, filtering, ordering and pagination.

    - List/retrieve: public.
    - Create: sellers and admins.
    - Update/delete: the owning seller or an admin.
    """

    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["name", "description", "category__name"]
    ordering_fields = ["price", "created_at", "name", "stock"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action == "create":
            return [IsSellerOrAdmin()]
        if self.action in {"update", "partial_update", "destroy"}:
            return [IsSellerOrAdmin(), IsProductOwnerOrAdmin()]
        return [AllowAny()]

    def get_queryset(self):
        qs = (
            Product.objects.select_related("seller", "category")
            .all()
        )
        # Sellers viewing the "mine" flag see their own inactive products too.
        if self.request.query_params.get("mine") and self.request.user.is_authenticated:
            return qs.filter(seller=self.request.user)
        # Public listing only shows active products.
        if self.action == "list":
            return qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        product = services.create_product(
            seller=self.request.user, **serializer.validated_data
        )
        serializer.instance = product
