# pyright: reportMissingImports=false
"""
BioCLIP taxonomic lineage template testing script (archived).
All prompt templates have been verified and integrated into backend/app/services/bioclip_service.py.
"""
import sys
from pathlib import Path

# Add backend to module search path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

try:
    from app.services.taxonomy_kb import TAXONOMY_DATABASE  # type: ignore[import-untyped]
    from app.utils.image_processing import validate_and_decode_image  # type: ignore[import-untyped]
except ImportError:
    pass
