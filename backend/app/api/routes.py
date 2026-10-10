from typing import Any, Dict, List

import psutil
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.exceptions import ImageValidationError
from app.repositories.taxonomy_repository import default_taxonomy_repository
from app.schemas.identification import (
    HealthResponse,
    IdentificationResponse,
    ModelStatusResponse,
    OutdoorMissionSchema,
)
from app.services.bioclip_service import BioClipService

router = APIRouter()

OUTDOOR_MISSIONS: List[Dict[str, Any]] = [
    {
        "id": "mission_silent_bird",
        "title": "The Silent Bird Watcher",
        "category": "Fauna & Behavior",
        "short_objective": "Observe a wild bird for 3 minutes without alarming it or approaching too closely.",
        "instructions": [
            "Find a comfortable, still vantage point near trees, shrubs, or a park water feature.",
            "Scan branches and ground until you spot a wild bird (e.g. robin, sparrow, jay, or duck).",
            "Keep your screen in your pocket. Observe its posture: Is it cocking its head? Foraging? Singing?",
            "Notice where it flies next before checking your phone."
        ],
        "suggested_duration": "3 to 5 minutes",
        "safety_reminder": "Keep a distance of at least 15-20 feet. Never pursue a nesting bird or offer human food.",
        "completion_action": "Record what behavior you observed in your Field Journal."
    },
    {
        "id": "mission_leaf_comparison",
        "title": "The Twin Leaf Comparison",
        "category": "Flora & Morphology",
        "short_objective": "Examine two leaves from different plant species and compare their margin structure and venation.",
        "instructions": [
            "Find two distinct living plants or trees along your trail or park path.",
            "Do not tear or rip leaves off living branches; examine them while attached or collect naturally fallen leaves.",
            "Compare the leaf margins: Is one smooth (entire) while the other has teeth (serrate) or lobes?",
            "Hold each leaf up to the daylight to trace the vein patterns (parallel vs. netted branching)."
        ],
        "suggested_duration": "5 minutes",
        "safety_reminder": "Watch for Eastern Poison Ivy ('leaves of three, let it be'). Never touch plants with shiny oils or thorny stems.",
        "completion_action": "Photograph one of the leaves to identify its species with WildLens AI."
    },
    {
        "id": "mission_pollinator_dance",
        "title": "The Pollinator Dance",
        "category": "Insects & Ecology",
        "short_objective": "Watch how a bee, butterfly, or hoverfly interacts with flowering plants.",
        "instructions": [
            "Locate an area with open blossoms or wildflowers in direct sunlight.",
            "Stand motionless beside the flowers and wait for a flying insect to alight.",
            "Notice how the insect maneuvers: Does it land delicately on petals, or buzz vigorously?",
            "Check for bright yellow or orange pollen pellets attached to its hind legs (corbicula)."
        ],
        "suggested_duration": "4 minutes",
        "safety_reminder": "Insects foraging on flowers are gentle when left undisturbed. Do not swat, trap, or corner them.",
        "completion_action": "Log the interaction in your Field Journal with notes on blossom color."
    },
    {
        "id": "mission_five_minute_soundscape",
        "title": "Five-Minute Forest Symphony",
        "category": "Mindfulness & Auditory",
        "short_objective": "Sit in a natural setting with eyes closed and count distinct non-human sounds.",
        "instructions": [
            "Find a bench, rock, or tree stump away from heavy automotive traffic.",
            "Pocket your device and close your eyes for five slow, steady breaths.",
            "Listen radially: What is the closest sound (wind rustling leaves, insect buzzing)? What is the furthest (distant bird call)?",
            "Try to identify how many different bird vocalizations you hear in 5 minutes."
        ],
        "suggested_duration": "5 minutes",
        "safety_reminder": "Ensure you are in a safe, designated public path where you are visible and secure.",
        "completion_action": "Mark this mission complete and note the quietest sound you detected."
    },
    {
        "id": "mission_bark_and_lichen",
        "title": "The Micro-Forest on Bark",
        "category": "Trees & Lichens",
        "short_objective": "Inspect the north-facing side of a mature tree trunk to spot moss, lichen, or fungi.",
        "instructions": [
            "Approach an older deciduous or evergreen tree.",
            "Look closely at the bark furrows. Can you spot flat crustose lichens or leafy foliose lichens?",
            "Notice the subtle colors: sage green, bright sulfur yellow, ash gray, or velvety emerald moss.",
            "Notice how lichens indicate clean air quality in your local area."
        ],
        "suggested_duration": "3 minutes",
        "safety_reminder": "Do not peel bark or scrape lichens from living tree trunks.",
        "completion_action": "Capture an image of the bark ecosystem to save in your Field Journal."
    }
]

@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    service = BioClipService.get_instance()
    mem_free = None
    try:
        mem_free = round(psutil.virtual_memory().available / (1024 * 1024), 1)
    except (psutil.Error, OSError, AttributeError):
        mem_free = None

    return HealthResponse(
        status="healthy",
        version=settings.version,
        model_status=service.status,
        device=service.device,
        system_memory_free_mb=mem_free
    )

@router.get("/model/status", response_model=ModelStatusResponse)
@router.get("/system/status", response_model=ModelStatusResponse)
def get_model_status() -> ModelStatusResponse:
    service = BioClipService.get_instance()
    return service.get_status()

@router.post("/model/load")
def load_model_explicit() -> Dict[str, Any]:
    service = BioClipService.get_instance()
    success = service.load_model()
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load BioCLIP-2 model: {service.last_error}"
        )
    return {
        "status": "success",
        "message": f"BioCLIP-2 model loaded successfully on device '{service.device}' in {service.load_time_seconds}s.",
        "model_status": service.get_status()
    }

@router.post("/identify", response_model=IdentificationResponse)
async def identify_nature_image(file: UploadFile = File(...)) -> IdentificationResponse:
    if file.content_type and file.content_type.lower() not in settings.allowed_mime_types:
        raise ImageValidationError(
            f"Unsupported file type '{file.content_type}'. Please upload a JPG, PNG, or WebP image."
        )

    try:
        image_bytes = await file.read()
    except (IOError, OSError) as e:
        raise ImageValidationError(f"Could not read uploaded image data: {e}") from e

    service = BioClipService.get_instance()
    return service.identify_image(image_bytes)

@router.get("/missions", response_model=List[OutdoorMissionSchema])
def get_missions() -> List[Dict[str, Any]]:
    return OUTDOOR_MISSIONS

@router.get("/species")
def get_species_reference() -> List[Dict[str, Any]]:
    return default_taxonomy_repository.list_all()
