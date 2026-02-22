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
from routes.upload_routes import router as upload_router
from routes.comment_routes import router as comment_router

# Include routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(counterparty_router, prefix="/api")
app.include_router(template_router, prefix="/api")
app.include_router(document_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(comment_router)


@app.get("/api/uploads/{filename}")
async def serve_upload(filename: str):
    """Serve uploaded files."""
    from fastapi.responses import FileResponse
    from pathlib import Path
    
    file_path = Path("/app/backend/uploads") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)


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


@app.post("/api/search-company")
async def search_company(request: dict):
    """
    Search company information by EDRPOU using YouScore API.
    API: https://api.youscore.com.ua/v1/usr/{edrpou}
    """
    import httpx
    
    try:
        edrpou = request.get("edrpou", "")
        
        if not edrpou or (len(edrpou) != 8 and len(edrpou) != 10):
            return {
                "found": False,
                "message": "Invalid EDRPOU (must be 8 or 10 digits)"
            }
        
        # Call YouScore API
        api_url = f"https://api.youscore.com.ua/v1/usr/{edrpou}"
        params = {
            "showCurrentData": "true",
            "apiKey": os.environ.get("YOUSCORE_API_KEY", ""),
        }
        
        headers = {
            "accept": "application/json"
        }
        
        logger.info(f"Searching company by EDRPOU: {edrpou}")
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(api_url, params=params, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # YouScore API returns data directly in root object
                # name - company name (object with fullName and shortName)
                # address - legal address (string)
                # signers - array with director info
                
                # Extract name from object or string
                name_obj = data.get("name", "")
                if isinstance(name_obj, dict):
                    # Use fullName (not shortName) as requested
                    name = name_obj.get("fullName") or name_obj.get("shortName", "")
                else:
                    name = name_obj
                
                address = data.get("address", "")
                
                # Get director from signers array
                director_name = ""
                signers = data.get("signers", [])
                if signers and isinstance(signers, list) and len(signers) > 0:
                    first_signer = signers[0]
                    if isinstance(first_signer, dict):
                        # Signers can be a string or object
                        director_name = (
                            first_signer.get("name") or 
                            first_signer.get("fullName") or 
                            first_signer.get("personName") or
                            first_signer if isinstance(first_signer, str) else
                            ""
                        )
                
                logger.info(f"Found company - Name: {name if name else 'None'}, Address: {address if address else 'None'}")
                
                if name or address:
                    return {
                        "found": True,
                        "name": name,
                        "legal_address": address,
                        "director_name": director_name if director_name else None
                    }
                else:
                    logger.warning(f"Company data incomplete for EDRPOU: {edrpou}")
                    return {
                        "found": False,
                        "message": "Company data incomplete"
                    }
            elif response.status_code == 404:
                logger.warning(f"Company not found for EDRPOU: {edrpou}")
                return {
                    "found": False,
                    "message": "Company not found in registry"
                }
            else:
                logger.error(f"API error: {response.status_code}")
                return {
                    "found": False,
                    "message": f"API error: {response.status_code}"
                }
        
    except httpx.TimeoutException:
        logger.error("API timeout")
        return {
            "found": False,
            "message": "API timeout. Please try again"
        }
    except Exception as e:
        logger.error(f"Error searching company: {str(e)}")
        return {
            "found": False,
            "message": "Error connecting to registry"
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
    
    # Initialize default templates
    try:
        from services.template_service import TemplateService
        template_service = TemplateService(db)
        await template_service.initialize_default_templates()
        logger.info("Default templates initialized")
    except Exception as e:
        logger.error(f"Failed to initialize default templates: {str(e)}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown."""
    logger.info("Application shutting down...")
    client.close()
    logger.info("MongoDB connection closed")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
