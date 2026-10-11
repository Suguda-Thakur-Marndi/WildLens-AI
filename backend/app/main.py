import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.api.routes import router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.services.bioclip_service import BioClipService

logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("wildlens")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("WildLens AI Backend initializing...")
    logger.info(f"Model: {settings.model_identifier} (Cache: {settings.model_cache_dir})")

    # Decouple backend server readiness (<100ms) from heavy PyTorch model initialization.
    # Enables immediate health and status checks while BioCLIP-2 initializes in the background.
    warmup_task = None
    if os.getenv("PRELOAD_MODEL_BACKGROUND", "1") == "1":
        service = BioClipService.get_instance()
        warmup_task = asyncio.create_task(run_in_threadpool(service.load_model))

    yield

    if warmup_task and not warmup_task.done():
        warmup_task.cancel()
    logger.info("WildLens AI Backend shutting down.")

app = FastAPI(
    title=settings.app_name,
    description="Offline-first nature identification and outdoor exploration engine powered by BioCLIP-2 open-weight AI.",
    version=settings.version,
    lifespan=lifespan
)

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https:\/\/([a-zA-Z0-9-]+\.)*github\.io$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
@app.get("/api")
def root():
    return {
        "app": settings.app_name,
        "challenge": "Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass",
        "principle": "Use open-source AI to help people explore the real world, rather than keeping them engaged with their screens.",
        "documentation": "/docs",
        "health": "/api/health",
        "model_status": "/api/model/status"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
