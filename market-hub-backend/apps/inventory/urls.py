"""Inventory URL routes."""
from rest_framework.routers import DefaultRouter

from .views import InventoryTransactionViewSet

app_name = "inventory"

router = DefaultRouter()
router.register("inventory", InventoryTransactionViewSet, basename="inventory")

urlpatterns = router.urls
