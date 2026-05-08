from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def standardized_exception_handler(exc, context):
    """Wrap DRF exceptions in a consistent payload structure."""
    response = exception_handler(exc, context)
    if response is None:
        return Response(
            {
                "error": {
                    "code": "internal_server_error",
                    "message": "An unexpected server error occurred.",
                    "details": None,
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    details = response.data
    message = "Request failed."

    if isinstance(details, dict):
        if "detail" in details and details["detail"]:
            message = str(details["detail"])
        elif "error" in details and details["error"]:
            message = str(details["error"])
        else:
            first_value = next(iter(details.values()), None)
            if isinstance(first_value, list) and first_value:
                message = str(first_value[0])
            elif first_value is not None:
                message = str(first_value)
    elif isinstance(details, list) and details:
        message = str(details[0])
    elif details:
        message = str(details)

    error_code = f"http_{response.status_code}"
    if response.status_code == status.HTTP_400_BAD_REQUEST:
        error_code = "bad_request"
    elif response.status_code == status.HTTP_401_UNAUTHORIZED:
        error_code = "unauthorized"
    elif response.status_code == status.HTTP_403_FORBIDDEN:
        error_code = "forbidden"
    elif response.status_code == status.HTTP_404_NOT_FOUND:
        error_code = "not_found"

    response.data = {
        "error": {
            "code": error_code,
            "message": message,
            "details": details,
        }
    }
    return response
