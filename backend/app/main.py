from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import health, auth, research
from app.core.config import settings
from app.services.qdrant_service import init_qdrant


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    init_qdrant()
    yield
    # Shutdown logic (if any)


app = FastAPI(
    title="Decentralized AI Swarm Research Platform",
    description="Backend API for decentralized agent-based research swarms",
    version="1.0",
    lifespan=lifespan,
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(research.router, prefix="/api/v1")
