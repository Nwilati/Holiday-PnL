from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, properties, channels, categories, bookings, expenses, dashboard

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Holiday Home P&L Management System API",
    version="1.0.0",
)

# CORS - Allow everything for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(properties.router, prefix="/api/v1")
app.include_router(channels.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(bookings.router, prefix="/api/v1")
app.include_router(expenses.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Holiday Home P&L API", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
