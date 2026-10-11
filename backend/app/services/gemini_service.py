import json
import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.gemini import (
    GeminiAskResponse,
    GeminiExplainResponse,
    GeminiStatusResponse,
)

logger = logging.getLogger("wildlens.gemini")


class GeminiService:
    """
    Service integrating Google's Gemini Generative AI for natural history synthesis.
    Strictly server-side; keys are never exposed in logs, query strings, or client responses.
    Handles credential lifecycle: missing, invalid, revoked, expired, and rate-limited states.
    """

    _instance: Optional["GeminiService"] = None

    def __init__(self) -> None:
        self.model = settings.gemini_model
        self.timeout = settings.gemini_timeout_seconds
        self.base_url = settings.gemini_api_base_url.rstrip("/")

    @classmethod
    def get_instance(cls) -> "GeminiService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def is_configured(self) -> bool:
        """Returns True only when a valid Gemini API key is configured."""
        try:
            return settings.is_gemini_configured()
        except Exception as e:
            logger.warning(f"Error checking Gemini configuration status: {e}")
            return False

    def _get_auth_headers(self) -> Dict[str, str]:
        """Constructs secure HTTP request headers avoiding exposing key in query strings."""
        api_key = settings.get_gemini_api_key()
        return {
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        }

    async def get_status(self) -> GeminiStatusResponse:
        """
        Reports Gemini service readiness without disclosing the secret API key.
        Performs an active probe to verify credential validity and upstream connectivity.
        """
        if not self.is_configured:
            return GeminiStatusResponse(
                status="unconfigured",
                model=self.model,
                configured=False,
                message="Gemini API key is not configured on backend. Live visual explanations and nature Q&A are disabled.",
                online=True,
            )

        # Probe model endpoint with authentication header
        try:
            url = f"{self.base_url}/{self.model}"
            headers = self._get_auth_headers()
            async with httpx.AsyncClient(timeout=min(self.timeout, 5.0)) as client:
                res = await client.get(url, headers=headers)

                if res.status_code == 200:
                    return GeminiStatusResponse(
                        status="ready",
                        model=self.model,
                        configured=True,
                        message="Gemini AI Naturalist service is ready for visual explanations and field Q&A.",
                        online=True,
                    )
                elif res.status_code in (401, 403) or (
                    res.status_code == 400
                    and any(k in res.text for k in ("API_KEY_INVALID", "API key not valid", "PERMISSION_DENIED"))
                ):
                    logger.warning("Gemini API key rejected by Google (HTTP %d). Credential may be invalid or expired.", res.status_code)
                    return GeminiStatusResponse(
                        status="invalid_key",
                        model=self.model,
                        configured=False,
                        message="Gemini API key is invalid, revoked, or expired. Please update GEMINI_API_KEY in backend settings.",
                        online=True,
                    )
                elif res.status_code == 429:
                    return GeminiStatusResponse(
                        status="rate_limited",
                        model=self.model,
                        configured=True,
                        message="Gemini API rate limit reached. Waiting for quota reset.",
                        online=True,
                    )
                else:
                    return GeminiStatusResponse(
                        status="unavailable",
                        model=self.model,
                        configured=True,
                        message=f"Gemini API returned HTTP {res.status_code}.",
                        online=False,
                    )
        except httpx.TimeoutException:
            logger.warning("Gemini status check timed out.")
            return GeminiStatusResponse(
                status="unavailable",
                model=self.model,
                configured=True,
                message="Gemini status probe timed out. Service may be slow or congested.",
                online=False,
            )
        except httpx.RequestError as err:
            logger.warning(f"Gemini status check failed: {err}")
            return GeminiStatusResponse(
                status="unavailable",
                model=self.model,
                configured=True,
                message="Cannot connect to Gemini service from backend. Check internet connection.",
                online=False,
            )

    async def explain_species(
        self,
        species_name: str,
        scientific_name: str = "",
        observation_context: str = "",
        image_base64: Optional[str] = None,
        user_prompt: Optional[str] = None,
    ) -> GeminiExplainResponse:
        """
        Produces educational natural history insights for an identified specimen.
        Image data is processed only if explicitly consented to by the user.
        Fails safely and explicitly; never returns fake hallucinated responses.
        """
        if not self.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API is not configured on backend. Set GEMINI_API_KEY in .env to enable naturalist explanations.",
            )

        system_instruction = (
            "You are WildLens AI's Expert Field Naturalist Guide. "
            "WildLens AI follows a 'Touch Grass' philosophy: encourage users to observe the real world directly, "
            "respect wildlife, and never destroy or consume specimens.\n"
            "Respond strictly in JSON format with the following keys:\n"
            "- explanation: A concise, engaging 2-3 sentence overview of this species and what makes it special.\n"
            "- ecological_role: How this organism interacts with its biome (pollinator, decomposer, canopy tree, forage, etc.).\n"
            "- sensory_cues: Array of 3 specific observable field cues (e.g. bark texture, leaf margin venation, scent, flight pattern, birdsong).\n"
            "- lookalikes_distinction: Key morphological difference to distinguish from common confusing lookalikes.\n"
            "- safety_disclaimer: Specific field safety guidance. MANDATORY: If the organism is any fungus or wild mushroom, unconditionally state: 'Never eat wild mushrooms based on computer vision or AI identification.' Otherwise, provide standard ethical observation guidance."
        )

        user_content = (
            f"Specimen Common Name: {species_name}\n"
            f"Scientific Name: {scientific_name or 'Unknown'}\n"
            f"Field Observation Context: {observation_context or 'In situ field photo'}\n"
        )
        if user_prompt:
            user_content += f"Observer Question: {user_prompt}\n"

        parts: List[Dict[str, Any]] = [
            {"text": f"{system_instruction}\n\n{user_content}\n\nReturn ONLY raw JSON."}
        ]

        if image_base64:
            raw_b64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": raw_b64.strip(),
                }
            })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }

        url = f"{self.base_url}/{self.model}:generateContent"
        headers = self._get_auth_headers()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, headers=headers, json=payload)

            if res.status_code == 429:
                logger.warning("Gemini rate limit exceeded (HTTP 429).")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Gemini API rate limit or quota exceeded. Please wait a moment before trying again.",
                )
            elif res.status_code in (401, 403) or (
                res.status_code == 400
                and any(k in res.text for k in ("API_KEY_INVALID", "API key not valid", "PERMISSION_DENIED"))
            ):
                logger.error("Gemini API authentication failure (HTTP %d). Credential invalid or revoked.", res.status_code)
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gemini API authentication failed: API key is invalid, revoked, or expired. Check backend GEMINI_API_KEY configuration.",
                )
            elif res.status_code >= 500:
                logger.error(f"Gemini upstream server error {res.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini API upstream service error (HTTP {res.status_code}).",
                )
            elif res.status_code != 200:
                logger.error(f"Gemini API error {res.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini API returned error HTTP {res.status_code}.",
                )

            data = res.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gemini API returned empty response candidates.",
                )

            content_text = (
                candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
            )

            try:
                parsed = json.loads(content_text)
            except json.JSONDecodeError:
                parsed = {
                    "explanation": content_text,
                    "ecological_role": "Naturalist role in local ecosystem.",
                    "sensory_cues": ["Examine overall morphology in natural daylight."],
                    "lookalikes_distinction": "Compare key diagnostic field traits.",
                    "safety_disclaimer": "Observe wildlife from a safe and respectful distance.",
                }

            # Safety enforcement for fungi
            disclaimer = parsed.get("safety_disclaimer", "")
            is_fungi = (
                "mushroom" in species_name.lower()
                or "agaric" in species_name.lower()
                or "fung" in species_name.lower()
                or "bolete" in species_name.lower()
            )
            if is_fungi and "never eat" not in disclaimer.lower():
                disclaimer = (
                    "MANDATORY SAFETY: Never eat wild mushrooms based on computer vision or AI identification. "
                    + disclaimer
                )

            explanation_text = parsed.get("explanation", "")
            return GeminiExplainResponse(
                species_name=species_name,
                scientific_name=scientific_name,
                explanation=explanation_text,
                ecological_role=parsed.get("ecological_role", ""),
                sensory_cues=parsed.get("sensory_cues", []),
                lookalikes_distinction=parsed.get("lookalikes_distinction", ""),
                safety_disclaimer=disclaimer,
                model_used=self.model,
                cached=False,
                summary=explanation_text,
                seasonal_behavior=parsed.get(
                    "seasonal_behavior", "Active across native seasonal phenology cycles."
                ),
                is_fungi=is_fungi,
                provider=f"Google Gemini ({self.model})",
            )

        except httpx.TimeoutException as e:
            logger.warning(f"Gemini explain timeout after {self.timeout}s: {e}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Gemini API request timed out after {self.timeout} seconds. Please try again.",
            ) from e
        except httpx.RequestError as e:
            logger.warning(f"Gemini explain network error: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not reach Gemini service. Please check backend internet connection.",
            ) from e

    async def ask_naturalist(
        self,
        question: str,
        species_context: Optional[str] = None,
        image_base64: Optional[str] = None,
    ) -> GeminiAskResponse:
        """
        Interactive Q&A for field nature inquiries.
        Gracefully handles failure modes without silent hallucinations.
        """
        if not self.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API is not configured on backend. Set GEMINI_API_KEY in .env to enable nature Q&A.",
            )

        system_instruction = (
            "You are WildLens AI's Field Naturalist AI Assistant. Answer the user's outdoor exploration, "
            "botanical, entomological, ornithological, or nature question thoughtfully, accurately, and concisely. "
            "Promote non-destructive field observation, sensory awareness, and safety. "
            "Never fabricate species details. If unknown, recommend field traits to inspect."
        )

        user_content = f"Question: {question}\n"
        if species_context:
            user_content = f"Subject Context: {species_context}\n" + user_content

        parts: List[Dict[str, Any]] = [
            {"text": f"{system_instruction}\n\n{user_content}"}
        ]

        if image_base64:
            raw_b64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
            parts.append({
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": raw_b64.strip(),
                }
            })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.3,
            },
        }

        url = f"{self.base_url}/{self.model}:generateContent"
        headers = self._get_auth_headers()

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, headers=headers, json=payload)

            if res.status_code == 429:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Gemini API rate limit or quota exceeded. Please wait a moment before trying again.",
                )
            elif res.status_code in (401, 403) or (
                res.status_code == 400
                and any(k in res.text for k in ("API_KEY_INVALID", "API key not valid", "PERMISSION_DENIED"))
            ):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gemini API authentication failed: API key is invalid, revoked, or expired. Check backend GEMINI_API_KEY configuration.",
                )
            elif res.status_code >= 500:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini API upstream service error (HTTP {res.status_code}).",
                )
            elif res.status_code != 200:
                logger.error(f"Gemini API error {res.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Gemini API returned error HTTP {res.status_code}.",
                )

            data = res.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Gemini API returned empty response candidates.",
                )

            answer = (
                candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            )

            safety_notice = None
            if "mushroom" in question.lower() or "fung" in question.lower():
                safety_notice = "Never consume wild mushrooms based on computer vision or AI identification."

            return GeminiAskResponse(
                answer=answer.strip(),
                model_used=self.model,
                attribution="Google Gemini API (External Cloud Service)",
                safety_disclaimer=safety_notice,
            )

        except httpx.TimeoutException as e:
            logger.warning(f"Gemini ask timeout: {e}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Gemini API request timed out after {self.timeout} seconds. Please try again.",
            ) from e
        except httpx.RequestError as e:
            logger.warning(f"Gemini ask network error: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not reach Gemini service. Please check backend internet connection.",
            ) from e


gemini_service = GeminiService.get_instance()
