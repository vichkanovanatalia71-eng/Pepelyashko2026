"""Main FastAPI application with MongoDB and authentication."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

logger.info(f"Connected to MongoDB: {MONGO_URL}")

# Create FastAPI app
app = FastAPI(
    title="Document Management System",
    description="API для системи управління документами",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routes.auth_routes import router as auth_router
from routes.counterparty_routes import router as counterparty_router
from routes.template_routes import router as template_router
from routes.document_routes import router as document_router

# Include routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(counterparty_router, prefix="/api")
app.include_router(template_router, prefix="/api")
app.include_router(document_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Document Management System API v2.0",
        "status": "running",
        "auth": "enabled"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Test MongoDB connection
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "version": "2.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    logger.info("Application starting up...")
    logger.info(f"MongoDB Database: {DB_NAME}")
    
    # Test database connection
    try:
        await db.command("ping")
        logger.info("MongoDB connection successful")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info("Application shutting down...")
    client.close()
    logger.info("MongoDB connection closed")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
