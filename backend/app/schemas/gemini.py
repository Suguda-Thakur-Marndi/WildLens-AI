from typing import List, Optional

from pydantic import BaseModel, Field


class GeminiStatusResponse(BaseModel):
    status: str = Field(..., description="'ready', 'unconfigured', or 'unavailable'")
    model: str = Field(..., description="Active Gemini model identifier (e.g. gemini-2.5-flash)")
    configured: bool = Field(..., description="True if GEMINI_API_KEY is provided on backend")
    message: str = Field(..., description="Human-readable status summary")
    online: bool = Field(..., description="True if backend server has internet connectivity to Google AI")


class GeminiExplainRequest(BaseModel):
    species_name: Optional[str] = Field(None, description="Common name of the identified species")
    specimen_name: Optional[str] = Field(None, description="Alias for species_name")
    common_name: Optional[str] = Field(None, description="Alias for species_name")
    scientific_name: Optional[str] = Field("", description="Binomial scientific name")
    family: Optional[str] = Field("", description="Taxonomic family")
    kingdom: Optional[str] = Field("", description="Taxonomic kingdom")
    diagnostic_traits: Optional[List[str]] = Field(default_factory=list)
    confidence: Optional[float] = Field(None)
    observation_context: Optional[str] = Field("", description="Context such as location, habitat, or visual score")
    image_base64: Optional[str] = Field(None, description="Optional base64 JPEG/PNG image data if user explicitly consented")
    user_prompt: Optional[str] = Field(None, description="Optional custom natural history question")

    def get_name(self) -> str:
        return self.species_name or self.specimen_name or self.common_name or "Wild Specimen"


class GeminiExplainResponse(BaseModel):
    species_name: str
    scientific_name: str
    explanation: str
    ecological_role: str
    sensory_cues: List[str] = Field(default_factory=list)
    lookalikes_distinction: str
    safety_disclaimer: str
    model_used: str
    cached: bool = False
    summary: Optional[str] = None
    seasonal_behavior: Optional[str] = None
    is_fungi: Optional[bool] = False
    provider: Optional[str] = "Google Gemini (Server-Managed)"


class GeminiAskRequest(BaseModel):
    question: str = Field(..., description="Naturalist inquiry or question about wildlife/nature")
    species_context: Optional[str] = Field(None, description="Optional species or observation context")
    specimen_name: Optional[str] = Field(None)
    scientific_name: Optional[str] = Field(None)
    family: Optional[str] = Field(None)
    context: Optional[str] = Field(None)
    image_base64: Optional[str] = Field(None, description="Optional base64 image if user explicitly consented")

    def get_context(self) -> Optional[str]:
        return self.species_context or self.context or self.specimen_name


class GeminiAskResponse(BaseModel):
    answer: str
    model_used: str
    attribution: str = "Google Gemini API (External Cloud Service)"
    safety_disclaimer: Optional[str] = None
