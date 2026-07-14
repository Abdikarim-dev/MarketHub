"""Views for the reviews app."""
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from .models import Review
from .permissions import IsCustomerForWrite, IsReviewAuthorOrAdmin
from .serializers import ReviewSerializer
from . import services


@extend_schema(tags=["Reviews"])
class ReviewViewSet(viewsets.ModelViewSet):
    """CRUD for product reviews.

    - List/retrieve: public.
    - Create: customers who purchased the product.
    - Update/delete: the review author or an admin.
    """

    serializer_class = ReviewSerializer
    permission_classes = [IsCustomerForWrite, IsReviewAuthorOrAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["product", "rating", "user"]
    ordering_fields = ["created_at", "rating"]

    def get_queryset(self):
        return Review.objects.select_related("user", "product")

    def perform_create(self, serializer):
        review = services.create_review(
            user=self.request.user,
            product=serializer.validated_data["product"],
            rating=serializer.validated_data["rating"],
            comment=serializer.validated_data.get("comment", ""),
        )
        serializer.instance = review
