"""Serializers for the products app."""
from rest_framework import serializers

from .models import Category, Product, ProductImage


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


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "url", "alt_text", "sort_order"]
        read_only_fields = ["id"]


class ProductSerializer(serializers.ModelSerializer):
    """Read/write serializer for products.

    ``seller`` is assigned automatically from the authenticated user and is
    never accepted from the client.
    """

    seller = serializers.PrimaryKeyRelatedField(read_only=True)
    seller_username = serializers.CharField(source="seller.username", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    images = ProductImageSerializer(source="gallery", many=True, read_only=True)
    primary_image = serializers.SerializerMethodField()
    # Keep ``image`` as the primary display URL for older clients.
    image = serializers.SerializerMethodField()
    image_upload = serializers.ImageField(
        source="image", required=False, allow_null=True, write_only=True
    )
    gallery_urls = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        write_only=True,
        help_text="Optional list of remote image URLs (appended to the gallery).",
    )

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
            "image_upload",
            "primary_image",
            "images",
            "gallery_urls",
            "is_active",
            "in_stock",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "seller",
            "image",
            "primary_image",
            "images",
            "created_at",
            "updated_at",
        ]

    def get_primary_image(self, obj: Product) -> str | None:
        return self._absolute(obj.primary_image_url)

    def get_image(self, obj: Product) -> str | None:
        return self.get_primary_image(obj)

    def _absolute(self, url: str | None) -> str | None:
        if not url:
            return None
        if url.startswith("http"):
            return url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)
        return url

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def create(self, validated_data):
        gallery_urls = validated_data.pop("gallery_urls", [])
        product = super().create(validated_data)
        self._append_gallery(product, gallery_urls)
        return product

    def update(self, instance, validated_data):
        gallery_urls = validated_data.pop("gallery_urls", None)
        product = super().update(instance, validated_data)
        if gallery_urls is not None:
            self._append_gallery(product, gallery_urls)
        return product

    def _append_gallery(self, product: Product, urls: list[str]):
        start = product.gallery.count()
        ProductImage.objects.bulk_create(
            [
                ProductImage(
                    product=product,
                    url=url,
                    alt_text=f"{product.name} photo {start + i + 1}",
                    sort_order=start + i,
                )
                for i, url in enumerate(urls)
            ]
        )
