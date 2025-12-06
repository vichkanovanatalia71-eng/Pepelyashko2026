"""API route modules."""

from .auth_routes import router as auth_router
from .counterparty_routes import router as counterparty_router
from .template_routes import router as template_router
from .document_routes import router as document_router

__all__ = [
    "auth_router",
    "counterparty_router",
    "template_router",
    "document_router",
]
