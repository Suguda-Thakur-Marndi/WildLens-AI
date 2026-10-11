import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, SecretStr, field_validator

logger = logging.getLogger("wildlens.config")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


def _load_env_file(env_path: Path) -> None:
    """
    Safely loads environment variables from a .env file into os.environ.
    Preserves existing system environment variables (e.g. from container or hosting provider).
    """
    if not env_path.exists():
        return
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("\"'")
                # Never override existing process environment variables
                if k and k not in os.environ:
                    os.environ[k] = v
    except Exception as e:
        logger.debug("Could not read .env file at %s: %s", env_path, e)


# Load local .env into process environment before initializing Settings
_load_env_file(PROJECT_ROOT / ".env")
_load_env_file(Path(".env"))


class Settings(BaseModel):
    """
    Centralized, strongly-typed, and validated configuration for WildLens AI.
    Loads from system environment variables and local .env file.
    Secrets are securely managed using SecretStr to prevent accidental leakage in logs or dumps.
    """

    # --- Core Application Metadata ---
    app_name: str = "WildLens AI"
    version: str = "1.0.0"
    environment: str = Field(
        default_factory=lambda: os.getenv("ENVIRONMENT", "production").lower()
    )
    debug: bool = Field(
        default_factory=lambda: os.getenv("DEBUG", "0").lower() in ("1", "true", "yes")
    )

    # --- Server Network Configuration ---
    host: str = Field(
        default_factory=lambda: os.getenv("WILDLENS_HOST", os.getenv("HOST", "127.0.0.1"))
    )
    port: int = Field(default_factory=lambda: int(os.getenv("PORT", "8000")))

    # --- CORS Allowed Origins ---
    cors_origins: List[str] = Field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,https://suguda-thakur-marndi.github.io",
            ).split(",")
            if origin.strip()
        ]
    )

    # --- BioCLIP-2 Vision Foundation Model ---
    model_identifier: str = Field(
        default_factory=lambda: os.getenv(
            "VISION_MODEL_ID", os.getenv("MODEL_IDENTIFIER", "imageomics/bioclip-2")
        )
    )
    vision_device: str = Field(
        default_factory=lambda: os.getenv("VISION_DEVICE", os.getenv("DEVICE", "auto")).lower()
    )
    model_revision: str = "2957b322090f9cb17ae72c71981c7218a28d81e0"
    model_license: str = "MIT"
    model_cache_dir: Path = Field(
        default_factory=lambda: Path(
            os.getenv("MODEL_CACHE_DIR", str(PROJECT_ROOT / "models" / "bioclip_cache"))
        )
    )
    hf_token: Optional[Union[SecretStr, str]] = Field(
        default_factory=lambda: (
            SecretStr(os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN", ""))
            if (os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_HUB_TOKEN"))
            else None
        )
    )
    hf_hub_offline: bool = Field(
        default_factory=lambda: os.getenv("HF_HUB_OFFLINE", "1").lower() in ("1", "true", "yes")
    )
    preload_model_background: bool = Field(
        default_factory=lambda: os.getenv("PRELOAD_MODEL_BACKGROUND", "1").lower() in ("1", "true", "yes")
    )

    # --- Image Processing & Inference Guards ---
    max_upload_size_bytes: int = Field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_SIZE_MB", "15")) * 1024 * 1024
    )
    allowed_mime_types: List[str] = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "image/avif",
    ]
    min_image_dimension: int = 10
    max_image_dimension: int = 8000
    thumbnail_max_dimension: int = 3000
    out_of_distribution_threshold: float = Field(
        default_factory=lambda: float(os.getenv("OUT_OF_DISTRIBUTION_THRESHOLD", "0.60"))
    )

    # --- Google Gemini AI Naturalist (Optional External Cloud Provider) ---
    gemini_api_key: Optional[Union[SecretStr, str]] = Field(
        default_factory=lambda: (
            SecretStr(os.getenv("GEMINI_API_KEY", "").strip())
            if os.getenv("GEMINI_API_KEY", "").strip()
            else None
        )
    )
    gemini_api_base_url: str = Field(
        default_factory=lambda: os.getenv(
            "GEMINI_API_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/models"
        )
    )
    gemini_model: str = Field(
        default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    )
    gemini_timeout_seconds: float = Field(
        default_factory=lambda: float(os.getenv("GEMINI_TIMEOUT_SECONDS", "15.0"))
    )
    gemini_max_retries: int = Field(
        default_factory=lambda: int(os.getenv("GEMINI_MAX_RETRIES", "2"))
    )

    @field_validator("port")
    @classmethod
    def validate_port_range(cls, v: int) -> int:
        if not (1 <= v <= 65535):
            raise ValueError(f"Port must be between 1 and 65535, got {v}")
        return v

    @field_validator("gemini_timeout_seconds")
    @classmethod
    def validate_gemini_timeout(cls, v: float) -> float:
        if v <= 0:
            raise ValueError(f"gemini_timeout_seconds must be positive, got {v}")
        return v

    @field_validator("out_of_distribution_threshold")
    @classmethod
    def validate_ood_threshold(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError(f"out_of_distribution_threshold must be between 0.0 and 1.0, got {v}")
        return v

    @field_validator("max_upload_size_bytes")
    @classmethod
    def validate_max_upload_size(cls, v: int) -> int:
        if v <= 0:
            raise ValueError(f"max_upload_size_bytes must be positive, got {v}")
        return v

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, (list, tuple)):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return v

    # --- Safe Accessors & Sanitized Representations ---

    def get_gemini_api_key(self) -> str:
        """
        Safely extracts the raw string value of the Gemini API key for outbound API calls.
        Returns empty string if unconfigured. Never print or log this value.
        """
        if self.gemini_api_key is None:
            return ""
        if isinstance(self.gemini_api_key, SecretStr):
            return self.gemini_api_key.get_secret_value().strip()
        return str(self.gemini_api_key or "").strip()

    def is_gemini_configured(self) -> bool:
        """Returns True only if a non-empty, plausible Gemini API key is configured."""
        raw = self.get_gemini_api_key()
        return bool(raw and len(raw) > 5)

    def get_masked_gemini_key(self) -> str:
        """Returns a sanitized masked representation of the Gemini API key for safe logs/diagnostics."""
        raw = self.get_gemini_api_key()
        if not raw:
            return "[UNCONFIGURED]"
        if len(raw) <= 8:
            return "********"
        return f"{raw[:4]}...{raw[-4:]} ({len(raw)} chars)"

    def get_hf_token(self) -> Optional[str]:
        """Safely extracts the raw string value of the optional Hugging Face Hub token."""
        if self.hf_token is None:
            return None
        if isinstance(self.hf_token, SecretStr):
            val = self.hf_token.get_secret_value().strip()
            return val if val else None
        val = str(self.hf_token or "").strip()
        return val if val else None

    def safe_summary(self) -> Dict[str, Any]:
        """
        Provides a sanitized configuration summary suitable for startup logs, telemetry, and diagnostics.
        Guarantees that secret values are never exposed.
        """
        return {
            "app_name": self.app_name,
            "version": self.version,
            "environment": self.environment,
            "host": self.host,
            "port": self.port,
            "vision_model": self.model_identifier,
            "vision_device": self.vision_device,
            "model_cache_dir": str(self.model_cache_dir),
            "hf_hub_offline": self.hf_hub_offline,
            "hf_token_configured": bool(self.get_hf_token()),
            "gemini_configured": self.is_gemini_configured(),
            "gemini_model": self.gemini_model,
            "gemini_base_url": self.gemini_api_base_url,
            "gemini_key_status": self.get_masked_gemini_key(),
            "gemini_timeout_seconds": self.gemini_timeout_seconds,
            "cors_origins_count": len(self.cors_origins),
            "max_upload_size_mb": round(self.max_upload_size_bytes / (1024 * 1024), 1),
            "ood_threshold": self.out_of_distribution_threshold,
        }

    def __repr__(self) -> str:
        return f"Settings({self.safe_summary()})"

    def __str__(self) -> str:
        return self.__repr__()


# Singleton instance loaded once
settings = Settings()

# Enforce offline flag if model cache directory exists
if Path(settings.model_cache_dir).exists() and settings.hf_hub_offline:
    os.environ["HF_HUB_OFFLINE"] = "1"


def validate_startup_configuration() -> Dict[str, Any]:
    """
    Validates backend configuration on startup.
    Ensures safe settings without printing or disclosing secret values.
    """
    summary = settings.safe_summary()
    logger.info(
        "Configuration validated: %s v%s running on %s:%s (Device: %s)",
        settings.app_name,
        settings.version,
        settings.host,
        settings.port,
        settings.vision_device,
    )
    if settings.is_gemini_configured():
        logger.info(
            "Gemini AI Naturalist: Active (Model: %s, Key: %s, BaseURL: %s, Timeout: %.1fs)",
            settings.gemini_model,
            settings.get_masked_gemini_key(),
            settings.gemini_api_base_url,
            settings.gemini_timeout_seconds,
        )
    else:
        logger.info(
            "Gemini AI Naturalist: Unconfigured (Optional cloud services disabled; BioCLIP-2 local inference remains fully operational)"
        )
    return summary
