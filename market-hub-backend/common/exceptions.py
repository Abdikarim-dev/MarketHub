"""Custom DRF exception handling and reusable domain exceptions."""
import logging

from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler

logger = logging.getLogger("markethub")


class ServiceError(APIException):
    """Raised by service-layer functions for expected business-rule failures."""

    status_code = 400
    default_detail = "The request could not be processed."
    default_code = "service_error"


class InsufficientStockError(ServiceError):
    default_detail = "Requested quantity exceeds available stock."
    default_code = "insufficient_stock"


def custom_exception_handler(exc, context):
    """Wrap DRF's default handler with a consistent error envelope + logging."""
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception: log the full traceback and return a generic 500.
        logger.exception("Unhandled exception in %s", context.get("view"))
        from rest_framework.response import Response

        return Response(
            {
                "error": {
                    "type": "server_error",
                    "detail": "An unexpected error occurred.",
                }
            },
            status=500,
        )

    detail = response.data
    error_type = getattr(exc, "default_code", "error")
    response.data = {
        "error": {
            "type": error_type,
            "status_code": response.status_code,
            "detail": detail,
        }
    }
    return response
