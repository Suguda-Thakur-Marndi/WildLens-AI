import os
from pathlib import Path
from typing import List

from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent

class Settings(BaseModel):
    app_name: str = "WildLens AI"
    version: str = "1.0.0"
    debug: bool = False

    host: str = Field(default_factory=lambda: os.getenv("HOST", "127.0.0.1"))
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", "8000")))

    model_identifier: str = Field(
        default_factory=lambda: os.getenv("VISION_MODEL_ID", os.getenv("MODEL_IDENTIFIER", "imageomics/bioclip-2"))
    )
    vision_device: str = Field(
        default_factory=lambda: os.getenv("VISION_DEVICE", os.getenv("DEVICE", "auto")).lower()
    )
    model_revision: str = "2957b322090f9cb17ae72c71981c7218a28d81e0"
    model_license: str = "MIT"
    model_cache_dir: Path = Field(
        default_factory=lambda: Path(os.getenv("MODEL_CACHE_DIR", str(PROJECT_ROOT / "models" / "bioclip_cache")))
    )

    max_upload_size_bytes: int = Field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_SIZE_MB", "15")) * 1024 * 1024
    )
    allowed_mime_types: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "image/avif"
    ]

    min_image_dimension: int = 10
    max_image_dimension: int = 8000
    thumbnail_max_dimension: int = 3000

    out_of_distribution_threshold: float = Field(
        default_factory=lambda: float(os.getenv("OUT_OF_DISTRIBUTION_THRESHOLD", "0.60"))
    )

    cors_origins: List[str] = Field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
            ).split(",")
            if origin.strip()
        ]
    )

settings = Settings()

# Lock offline environment variables if local cache exists
if Path(settings.model_cache_dir).exists():
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"

