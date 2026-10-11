from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TaxonomicHierarchy(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    kingdom: Optional[str] = Field(None, description="Biological kingdom (e.g., Plantae, Animalia, Fungi)")
    phylum: Optional[str] = Field(None, description="Biological phylum/division")
    class_name: Optional[str] = Field(None, alias="class", description="Biological class")
    order: Optional[str] = Field(None, description="Biological order")
    family: Optional[str] = Field(None, description="Biological family")
    genus: Optional[str] = Field(None, description="Biological genus")
    species: Optional[str] = Field(None, description="Specific epithet / species")


class CandidateSpecies(BaseModel):
    common_name: str = Field(..., description="Recognized common English name")
    scientific_name: str = Field(..., description="Binomial taxonomic nomenclature (Genus species)")
    taxonomic_rank: str = Field("species", description="Taxonomic rank identified (species, genus, family)")
    similarity_score: float = Field(0.0, description="Raw cosine similarity score in BioCLIP-2 embedding space [-1, 1]")
    softmax_density: float = Field(0.0, ge=0.0, le=1.0, description="Relative softmax density across closed candidate catalog (uncalibrated)")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Legacy alias for softmax_density (uncalibrated relative mass)")
    taxonomy: TaxonomicHierarchy
    visual_characteristics: List[str] = Field(default_factory=list, description="Visual markers evident in typical specimens")
    distinguishing_features: List[str] = Field(default_factory=list, description="Key features to inspect outdoors to confirm identification")
    lookalikes: List[str] = Field(default_factory=list, description="Common confusion species in nature")
    habitat_notes: str = Field("", description="Typical natural environment where this organism thrives")
    field_verification_tip: str = Field("", description="Actionable outdoor sensory check (leaf veins, bark texture, flight pattern)")


class IdentificationResponse(BaseModel):
    # Core explicit prediction fields
    common_name: str = Field("", description="Top predicted organism common name")
    scientific_name: str = Field("", description="Top predicted organism binomial scientific name")
    similarity_score: float = Field(0.0, description="Top predicted organism raw cosine similarity score (embedding alignment)")
    softmax_density: float = Field(0.0, ge=0.0, le=1.0, description="Relative softmax density mass among the supplied candidates (uncalibrated)")
    calibrated_probability: Optional[float] = Field(None, description="Estimated probability of correctness calibrated on labeled data; None if uncalibrated")
    catalog_scope: str = Field("36 curated temperate woodland taxa", description="Description of the candidate catalog evaluated")
    confidence_status: str = Field("uncertain", description="Confidence status: 'confident', 'moderate', 'uncertain', or 'inconclusive'")
    model_name: str = Field("imageomics/bioclip-2", description="Foundation model identifier (imageomics/bioclip-2)")
    model_version: str = Field("main", description="Pinned model checkpoint version")
    candidate_count: int = Field(0, description="Actual number of biological candidate taxa evaluated")
    top_k_predictions: List[CandidateSpecies] = Field(default_factory=list, description="Ranked top-k predicted candidate species")

    # Backward compatibility fields
    primary_candidate: Optional[CandidateSpecies] = Field(None, description="Top predicted organism (alias for top_k_predictions[0])")
    alternative_candidates: List[CandidateSpecies] = Field(default_factory=list, description="Plausible alternative species")
    uncertainty_rating: str = Field("low", description="'confident', 'moderate', 'uncertain', or 'inconclusive'")
    uncertainty_warning: Optional[str] = Field(None, description="Honest uncertainty disclaimer when confidence is below reliable thresholds")
    suggested_outdoor_inspection: List[str] = Field(default_factory=list, description="Hands-on sensory observations for the user in the field")
    safety_and_ethics_reminder: str = Field(
        "Observe from a respectful distance. Never touch unknown wild fungi, insects, or plants with defensive toxins. Do not feed or disrupt wildlife.",
        description="Core Touch Grass ethics reminder"
    )
    inference_time_ms: float = Field(..., description="Latency of the local inference step in milliseconds")
    model_identifier: str = Field(..., description="Exact pinned model identifier (e.g. imageomics/bioclip-2)")
    offline_verified: bool = Field(True, description="Indicates whether inference ran locally without cloud dependency")


class ModelStatusResponse(BaseModel):
    status: str = Field(..., description="'ready', 'loading', 'uninitialized', or 'error'")
    model_name: str
    model_revision: str
    model_license: str
    device: str
    cache_directory: str
    supported_taxa_count: int
    memory_usage_mb: Optional[float] = None
    offline_capable: bool = True

    # Detailed Vision layer telemetry
    vision_model_id: str = "imageomics/bioclip-2"
    vision_model_license: str = "MIT"
    vision_device: str = "cpu"
    vision_memory_mb: Optional[float] = None


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "1.0.0"
    model_status: str
    device: str
    system_memory_free_mb: Optional[float] = None


class OutdoorMissionSchema(BaseModel):
    id: str = Field(..., description="Unique mission identifier")
    title: str = Field(..., description="Engaging field mission title")
    category: str = Field(..., description="Sensory/ecological focus category")
    suggested_duration: str = Field(..., description="Estimated exploration duration")
    short_objective: str = Field(..., description="Summary mission objective")
    instructions: List[str] = Field(default_factory=list, description="Step-by-step outdoor actions")
    safety_reminder: str = Field(..., description="Field safety guidelines")
    completion_action: str = Field(..., description="Verification goal to log")


class ModelLoadResponse(BaseModel):
    status: str = Field(..., description="Status after model load attempt")
    message: str = Field(..., description="Human-readable status summary")
