"""Root URL configuration for the MarketHub API."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

api_v1 = [
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.products.urls")),
    path("", include("apps.inventory.urls")),
    path("", include("apps.orders.urls")),
    path("", include("apps.payments.urls")),
    path("", include("apps.reviews.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include((api_v1, "api"))),
    # OpenAPI schema & documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
