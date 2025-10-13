from __future__ import annotations

import logging
from typing import Any, Mapping, Sequence

from django.core.exceptions import ValidationError as DjangoValidationError, PermissionDenied as DjangoPermissionDenied
from django.db import IntegrityError
from django.http import Http404

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_exception_handler
from rest_framework.exceptions import (
    APIException,
    ValidationError,
    NotAuthenticated,
    AuthenticationFailed,
    PermissionDenied,
    NotFound,
    MethodNotAllowed,
    Throttled,
    ParseError,
    UnsupportedMediaType,
    NotAcceptable,
)

logger = logging.getLogger("polls.exceptions")


# Optional helper you can import and raise where convenient
class ConflictError(APIException):
    status_code = 409
    default_detail = "Conflict."
    default_code = "conflict"


def _extract_request_id(request) -> str | None:
    if not request:
        return None
    return request.META.get("HTTP_X_REQUEST_ID") or request.META.get("REQUEST_ID")


def _normalize_details(data: Any) -> Any:
    """
    Convert DRF/serializer error formats into JSON-friendly details:
    - list/tuple -> list of strings
    - dict -> field: [messages]
    - primitive -> string
    """
    if data is None:
        return None
    if isinstance(data, (list, tuple)):
        return [_normalize_details(x) for x in data]
    if isinstance(data, Mapping):
        out = {}
        for k, v in data.items():
            out[str(k)] = _normalize_details(v)
        return out
    # DRF error strings may be ErrorDetail objects; cast to str
    return str(data)


def _build_response(
    *,
    status: int,
    code: str,
    message: str,
    details: Any = None,
    request=None,
    headers: dict | None = None,
    extra: dict | None = None,
) -> Response:
    payload = {
        "error": {
            "code": code,
            "message": message,
            "status": status,
        }
    }
    if details is not None:
        payload["error"]["details"] = _normalize_details(details)

    req_id = _extract_request_id(request)
    if req_id:
        payload["error"]["request_id"] = req_id

    if extra:
        payload["error"].update(extra)

    return Response(payload, status=status, headers=headers or {})


def drf_exception_handler(exc: Exception, context: dict) -> Response | None:
    """
    Unified error envelope for DRF & Django exceptions.
    """
    request = context.get("request")

    # ---- Explicit mappings for common cases ----
    if isinstance(exc, (ValidationError, DjangoValidationError, ParseError)):
        # 400
        details = getattr(exc, "detail", None) or getattr(exc, "message_dict", None) or str(exc)
        return _build_response(
            status=400,
            code="validation_error",
            message="Invalid input.",
            details=details,
            request=request,
        )

    if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
        # 401
        msg = str(getattr(exc, "detail", "")) or "Authentication required."
        return _build_response(status=401, code="unauthorized", message=msg, request=request)

    if isinstance(exc, (PermissionDenied, DjangoPermissionDenied)):
        # 403
        msg = str(getattr(exc, "detail", "")) or "You do not have permission to perform this action."
        return _build_response(status=403, code="forbidden", message=msg, request=request)

    if isinstance(exc, (NotFound, Http404)):
        # 404
        msg = str(getattr(exc, "detail", "")) or "Not found."
        return _build_response(status=404, code="not_found", message=msg, request=request)

    if isinstance(exc, MethodNotAllowed):
        # 405
        msg = str(getattr(exc, "detail", "")) or "Method not allowed."
        headers = {}
        if hasattr(exc, "allowed_methods"):
            headers["Allow"] = ", ".join(getattr(exc, "allowed_methods", []))
        return _build_response(status=405, code="method_not_allowed", message=msg, request=request, headers=headers)

    if isinstance(exc, NotAcceptable):
        # 406
        msg = str(getattr(exc, "detail", "")) or "Not acceptable."
        return _build_response(status=406, code="not_acceptable", message=msg, request=request)

    if isinstance(exc, UnsupportedMediaType):
        # 415
        msg = str(getattr(exc, "detail", "")) or "Unsupported media type."
        return _build_response(status=415, code="unsupported_media_type", message=msg, request=request)

    if isinstance(exc, Throttled):
        # 429
        extra = {}
        if getattr(exc, "wait", None) is not None:
            extra["retry_after"] = int(exc.wait)
        msg = str(getattr(exc, "detail", "")) or "Rate limit exceeded."
        headers = {}
        if getattr(exc, "wait", None) is not None:
            headers["Retry-After"] = str(int(exc.wait))
        return _build_response(status=429, code="rate_limited", message=msg, request=request, headers=headers, extra=extra)

    if isinstance(exc, (ConflictError,)):
        # 409 by our custom exception
        msg = str(getattr(exc, "detail", "")) or "Conflict."
        return _build_response(status=409, code="conflict", message=msg, request=request)

    if isinstance(exc, IntegrityError):
        # 409 for DB unique/foreign key conflicts
        msg = "Conflict."
        # Try to be helpful for common unique violations
        raw = str(exc)
        if "duplicate key" in raw or "unique constraint" in raw:
            msg = "Duplicate resource."
        return _build_response(status=409, code="conflict", message=msg, request=request, details=raw)

    # ---- Fallback to DRF default, then wrap the payload ----
    resp = drf_default_exception_handler(exc, context)
    if resp is not None:
        # Try to infer a generic code by HTTP status class
        status = resp.status_code
        code_map = {
            400: "bad_request",
            401: "unauthorized",
            403: "forbidden",
            404: "not_found",
            405: "method_not_allowed",
            406: "not_acceptable",
            409: "conflict",
            415: "unsupported_media_type",
            422: "unprocessable_entity",
            429: "rate_limited",
        }
        code = code_map.get(status, "error")
        message = ""
        # Prefer DRF's 'detail' if present; otherwise a generic message
        data = getattr(resp, "data", None)
        if isinstance(data, Mapping) and "detail" in data:
            message = str(data.get("detail"))
            details = {k: v for k, v in data.items() if k != "detail"} or None
        else:
            details = data
            message = "Request failed."
        headers = getattr(resp, "headers", None) or {}
        # Preserve Retry-After if present
        extra = {}
        if "Retry-After" in headers:
            try:
                extra["retry_after"] = int(headers["Retry-After"])
            except Exception:
                pass
        return _build_response(
            status=status,
            code=code,
            message=message or "Request failed.",
            details=details,
            request=request,
            headers=headers,
            extra=extra or None,
        )

    # ---- Totally unexpected error (500) ----
    logger.exception("Unhandled exception", exc_info=exc)
    return _build_response(
        status=500,
        code="internal_error",
        message="Internal server error.",
        request=request,
    )
