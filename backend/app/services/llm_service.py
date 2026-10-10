"""
WildLens AI — Local Language Layer Service (Qwen3-8B).

Provides offline, grounded natural history field guidance and touch-grass missions
using open-weight Qwen/Qwen3-8B. Strictly text-only. BioCLIP identifies; Qwen only explains.

Constraints & Safety Guarantees:
1. Grounding: Context includes ONLY BioCLIP top-3 candidates, taxonomy, and taxonomy_kb traits/lookalikes.
2. Zero Hallucination: Forbidden from inventing species, binomial names, or facts.
3. Offline Only: Runs 100% locally from models/qwen3_cache without cloud egress.
4. Fungi Safety: Never implies edibility. Always appends the mandatory mushroom safety warning.
5. Non-blocking: CPU/GPU inference runs in a thread pool to avoid blocking FastAPI's event loop.
"""

import asyncio
import logging
import os
import re
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch

from app.core.config import settings
from app.repositories.taxonomy_repository import default_taxonomy_repository

logger = logging.getLogger("wildlens.llm")

MUSHROOM_SAFETY_WARNING = (
    "Mushroom Safety Warning: Never forage or consume wild mushrooms based on computer vision "
    "or AI identification. Fungi results are for educational interest only. Many edible species "
    "have deadly toxic lookalikes."
)


def strip_think_blocks(text: str) -> str:
    """Strips <think>...</think> reasoning blocks from Qwen3 output as a safety net."""
    if not text:
        return ""
    # Remove balanced <think>...</think> blocks
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", text, flags=re.DOTALL)
    # Remove unclosed <think> blocks if generation truncated
    cleaned = re.sub(r"<think>[\s\S]*$", "", cleaned, flags=re.DOTALL)
    # Remove stray tags
    cleaned = re.sub(r"</?think>", "", cleaned)
    return cleaned.strip()


class LLMService:
    _instance: Optional["LLMService"] = None

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.backend = getattr(settings, "llm_backend", "transformers").lower()
        self.model_id = getattr(settings, "llm_model_id", "Qwen/Qwen3-8B")
        self.cache_dir = getattr(settings, "llm_cache_dir", Path("models/qwen3_cache"))
        self.status: str = "uninitialized"  # 'uninitialized', 'ready', 'loading', 'unavailable', 'error'
        self.last_error: Optional[str] = None
        self.load_time_seconds: Optional[float] = None

        self.model = None
        self.tokenizer = None
        self._lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "LLMService":
        if cls._instance is None:
            cls._instance = LLMService()
        return cls._instance

    def is_ready(self) -> bool:
        return self.status == "ready"

    def get_status_info(self) -> Dict[str, Any]:
        mem_mb = None
        if torch.cuda.is_available() and self.device == "cuda":
            mem_mb = round(torch.cuda.memory_allocated() / (1024 * 1024), 2)

        return {
            "status": self.status,
            "backend": self.backend,
            "model_id": self.model_id,
            "device": self.device,
            "memory_usage_mb": mem_mb,
            "load_time_seconds": self.load_time_seconds,
            "offline_capable": True,
            "last_error": self.last_error,
        }

    def _is_cache_populated(self) -> bool:
        if not self.cache_dir.exists():
            return False
        # Check if the cache directory has any model or weights files
        cached_files = list(self.cache_dir.rglob("*.safetensors")) + list(self.cache_dir.rglob("*.bin"))
        return len(cached_files) > 0

    def load_model(self, force_reload: bool = False) -> bool:
        """
        Loads the LLM according to the configured backend (transformers or ollama).
        Uses 4-bit NF4 quantization on CUDA, falling back gracefully to CPU if unavailable.
        """
        with self._lock:
            if self.status == "ready" and not force_reload:
                return True

            self.status = "loading"
            start_time = time.time()
            logger.info(f"Initializing LLM Service (backend={self.backend}, model={self.model_id})...")

            if self.backend == "ollama":
                return self._load_ollama(start_time)
            else:
                return self._load_transformers(start_time)

    def _load_ollama(self, start_time: float) -> bool:
        try:
            import httpx

            base_url = getattr(settings, "ollama_base_url", "http://localhost:11434")
            # Loopback guard: only localhost / 127.0.0.1 allowed
            if not any(h in base_url for h in ("127.0.0.1", "localhost", "::1")):
                raise ValueError(f"Ollama base URL must be loopback only: {base_url}")

            response = httpx.get(f"{base_url}/api/tags", timeout=2.0)
            if response.status_code == 200:
                self.status = "ready"
                self.load_time_seconds = round(time.time() - start_time, 2)
                self.last_error = None
                logger.info(f"Ollama daemon detected at {base_url} in {self.load_time_seconds}s.")
                return True
            else:
                self.status = "unavailable"
                self.last_error = f"Ollama returned HTTP {response.status_code}"
                return False
        except Exception as e:
            self.status = "unavailable"
            self.last_error = f"Ollama not running: {e}"
            logger.warning(f"Ollama backend unavailable: {e}. Falling back to static traits.")
            return False

    def _load_transformers(self, start_time: float) -> bool:
        try:
            from transformers import AutoModelForCausalLM, AutoTokenizer

            self.cache_dir.mkdir(parents=True, exist_ok=True)
            is_offline = os.getenv("HF_HUB_OFFLINE") == "1"
            has_cache = self._is_cache_populated()

            # If offline and no local weights, fail gracefully without raising uncaught exception
            if is_offline and not has_cache:
                self.status = "unavailable"
                self.last_error = (
                    f"Local weights for '{self.model_id}' not found in {self.cache_dir} "
                    "and HF_HUB_OFFLINE=1 is enforced."
                )
                logger.warning(f"LLM not loaded: {self.last_error}. Naturalist static guidance will be used.")
                return False

            local_files_only = is_offline or has_cache

            logger.info(f"Loading tokenizer for '{self.model_id}' from {self.cache_dir} (local_only={local_files_only})...")
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_id,
                cache_dir=str(self.cache_dir),
                local_files_only=local_files_only,
                trust_remote_code=False,
            )

            # Device mapping and 4-bit NF4 configuration for target hardware
            if torch.cuda.is_available():
                logger.info("CUDA detected: loading Qwen3-8B in 4-bit NF4 mode...")
                try:
                    from transformers import BitsAndBytesConfig

                    compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
                    quantization_config = BitsAndBytesConfig(
                        load_in_4bit=True,
                        bnb_4bit_quant_type="nf4",
                        bnb_4bit_compute_dtype=compute_dtype,
                        bnb_4bit_use_double_quant=True,
                    )

                    self.model = AutoModelForCausalLM.from_pretrained(
                        self.model_id,
                        quantization_config=quantization_config,
                        device_map="auto",
                        cache_dir=str(self.cache_dir),
                        local_files_only=local_files_only,
                        trust_remote_code=False,
                    )
                    self.device = "cuda"
                except Exception as bnb_err:
                    logger.warning(f"4-bit CUDA load failed ({bnb_err}). Gracefully falling back to CPU...")
                    self.model = AutoModelForCausalLM.from_pretrained(
                        self.model_id,
                        device_map={"": "cpu"},
                        cache_dir=str(self.cache_dir),
                        local_files_only=local_files_only,
                        low_cpu_mem_usage=True,
                        trust_remote_code=False,
                    )
                    self.device = "cpu"
            else:
                logger.info("CUDA not available: loading Qwen3-8B on CPU/offload...")
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_id,
                    device_map={"": "cpu"},
                    cache_dir=str(self.cache_dir),
                    local_files_only=local_files_only,
                    low_cpu_mem_usage=True,
                    trust_remote_code=False,
                )
                self.device = "cpu"

            self.model.eval()
            self.status = "ready"
            self.load_time_seconds = round(time.time() - start_time, 2)
            self.last_error = None
            logger.info(f"Qwen3-8B loaded successfully in {self.load_time_seconds}s (device={self.device}).")
            return True

        except Exception as e:
            self.status = "unavailable"
            self.last_error = str(e)
            logger.warning(f"Failed to load transformers LLM: {e}. Fallback guidance will be used.")
            return False

    def build_grounding_context(
        self,
        common_name: str,
        scientific_name: str,
        similarity_score: float,
        confidence: float,
        confidence_status: str,
        taxonomy: Optional[Dict[str, Any]] = None,
        top_3_candidates: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[str, Dict[str, Any], bool]:
        """
        Builds the strictly grounded context. Contains ONLY:
        - BioCLIP top-3 candidates with confidence
        - Full taxonomy for top candidate
        - Matching entry from taxonomy_kb.py
        """
        kb_entry = default_taxonomy_repository.get_by_name(common_name) or default_taxonomy_repository.get_by_name(scientific_name)
        if kb_entry is None:
            # Fallback search by scientific binomial
            kb_entry = default_taxonomy_repository.get_by_name(scientific_name.split()[0]) or {}

        # Determine kingdom
        kingdom = ""
        if taxonomy:
            kingdom = str(taxonomy.get("kingdom", ""))
        elif kb_entry.get("taxonomy"):
            kingdom = str(kb_entry["taxonomy"].get("kingdom", ""))

        is_fungi = kingdom.lower() == "fungi" or "fung" in common_name.lower() or "mushroom" in common_name.lower()

        # Build candidate list representation
        candidates_str = ""
        if top_3_candidates:
            for idx, c in enumerate(top_3_candidates[:3], 1):
                c_name = c.get("common_name", "")
                s_name = c.get("scientific_name", "")
                conf = c.get("confidence", c.get("similarity_score", 0.0))
                candidates_str += f"{idx}. {c_name} ({s_name}) - BioCLIP Confidence: {conf * 100:.1f}%\n"
        else:
            candidates_str = f"1. {common_name} ({scientific_name}) - BioCLIP Confidence: {confidence * 100:.1f}%\n"

        # Build taxonomy string
        tax_str = ""
        if taxonomy:
            ranks = [
                f"Kingdom: {taxonomy.get('kingdom', 'Unknown')}",
                f"Phylum: {taxonomy.get('phylum', 'Unknown')}",
                f"Class: {taxonomy.get('class_name') or taxonomy.get('class', 'Unknown')}",
                f"Order: {taxonomy.get('order', 'Unknown')}",
                f"Family: {taxonomy.get('family', 'Unknown')}",
                f"Genus: {taxonomy.get('genus', 'Unknown')}",
                f"Species: {taxonomy.get('species', scientific_name)}",
            ]
            tax_str = ", ".join(ranks)
        elif kb_entry.get("taxonomy"):
            t = kb_entry["taxonomy"]
            tax_str = f"Kingdom: {t.get('kingdom')}, Family: {t.get('family')}, Genus: {t.get('genus')}, Species: {t.get('species')}"

        traits = kb_entry.get("distinguishing_features", [])
        traits_str = "; ".join(traits) if traits else "Examine morphological traits in situ."
        lookalikes = kb_entry.get("lookalikes", [])
        lookalikes_str = "; ".join(lookalikes) if lookalikes else "None cataloged in local flora."
        habitat = kb_entry.get("habitat_notes", "Local natural habitat.")
        tip = kb_entry.get("field_verification_tip", "Observe physical specimen carefully.")

        context = (
            f"--- BIOCLIP TAXONOMIC OUTPUT ---\n"
            f"Top Candidates:\n{candidates_str}\n"
            f"Taxonomic Lineage of Top Match: {tax_str}\n"
            f"Identification Status: {confidence_status} (Visual Similarity: {similarity_score:.4f}, Confidence: {confidence * 100:.1f}%)\n\n"
            f"--- VERIFIED FIELD TRAITS (TAXONOMY_KB) ---\n"
            f"Diagnostic Markers: {traits_str}\n"
            f"Known Lookalikes: {lookalikes_str}\n"
            f"Natural Habitat: {habitat}\n"
            f"Field Observation Tip: {tip}\n"
        )

        return context, kb_entry, is_fungi

    def build_prompt_messages(
        self,
        context: str,
        confidence_status: str,
        is_fungi: bool,
    ) -> List[Dict[str, str]]:
        """
        Constructs system and user chat prompt adhering strictly to grounding and safety rules.
        """
        system_rules = [
            "You are WildLens AI's offline field guidance layer. BioCLIP identified the species; your job is ONLY to explain the field traits.",
            "STRICT GROUNDING: Use ONLY facts provided in the context below. NEVER invent species, binomial names, facts, or assumptions.",
            "LENGTH & TONE: Keep your output under 120 words. Plain, accessible language. Glanceable outdoors in bright sunlight.",
        ]

        if confidence_status.lower() in ("uncertain", "inconclusive", "possible", "moderate"):
            system_rules.append(
                "UNCERTAINTY RULE: The identification is NOT certain. Clearly state that the identification is tentative or uncertain, and list the exact physical features from the context to check outdoors."
            )
        else:
            system_rules.append(
                "CONFIDENT ID: Explain the key physical field marks to confirm this specimen outdoors."
            )

        if is_fungi:
            system_rules.append(
                "HARD SAFETY RULE FOR FUNGI: NEVER state or imply that wild mushrooms are edible or safe to eat. Never encourage foraging or consumption."
            )

        system_rules.append(
            "END WITH SENSORY DIRECTIVE: End your final sentence with one short 'put the phone away' sensory prompt (e.g. 'Put your phone away: listen for 60 seconds, then check the underside of the leaf.')."
        )

        system_prompt = "\n".join(system_rules)
        user_prompt = f"Write field guidance based strictly on this verified data:\n\n{context}"

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _generate_static_fallback(
        self,
        common_name: str,
        scientific_name: str,
        confidence_status: str,
        kb_entry: Dict[str, Any],
        is_fungi: bool,
    ) -> Tuple[str, Optional[str], str]:
        """
        Produces deterministic, grounded natural history notes from taxonomy_kb.py
        when the LLM is uninitialized, loading, or disabled.
        """
        traits = kb_entry.get("distinguishing_features", [])
        lookalikes = kb_entry.get("lookalikes", [])
        tip = kb_entry.get("field_verification_tip", "Observe specimen carefully outdoors.")
        habitat = kb_entry.get("habitat_notes", "")

        is_uncertain = confidence_status.lower() in ("uncertain", "inconclusive", "possible", "moderate")

        if is_uncertain:
            notes = (
                f"Identification is tentative for {common_name} ({scientific_name}). "
                f"Confirm in the field by checking: {'; '.join(traits[:2]) if traits else 'morphology and posture'}. "
                f"{habitat}"
            )
        else:
            notes = (
                f"{common_name} ({scientific_name}). "
                f"Diagnostic field marks: {'; '.join(traits[:2]) if traits else 'observe physical traits'}. "
                f"Thrives in {habitat.lower() if habitat else 'natural habitats'}."
            )

        lookalike_warning = None
        if lookalikes:
            lookalike_warning = f"Compare with lookalikes: {'; '.join(lookalikes)}."

        touch_grass_prompt = f"Put your phone away: {tip}"

        if is_fungi:
            notes = f"{notes}\n\n{MUSHROOM_SAFETY_WARNING}"

        return notes.strip(), lookalike_warning, touch_grass_prompt.strip()

    def _run_transformers_generation(self, prompt_text: str) -> str:
        """Synchronous token generation executed inside a worker thread."""
        with self._lock:
            inputs = self.tokenizer(prompt_text, return_tensors="pt").to(self.device)
            gen_kwargs = {
                "max_new_tokens": getattr(settings, "llm_max_new_tokens", 300),
                "temperature": getattr(settings, "llm_temperature", 0.7),
                "top_p": getattr(settings, "llm_top_p", 0.8),
                "top_k": getattr(settings, "llm_top_k", 20),
                "do_sample": True,
                "pad_token_id": self.tokenizer.eos_token_id,
            }
            with torch.inference_mode():
                output_ids = self.model.generate(**inputs, **gen_kwargs)
            # Slice off input tokens to get generated text only
            generated_ids = output_ids[0][inputs.input_ids.shape[1]:]
            return self.tokenizer.decode(generated_ids, skip_special_tokens=True)

    async def _generate_ollama_text(self, messages: List[Dict[str, str]]) -> str:
        """Asynchronously calls local Ollama daemon via loopback HTTP."""
        import httpx

        base_url = getattr(settings, "ollama_base_url", "http://localhost:11434")
        model = getattr(settings, "ollama_model", "qwen3:8b")
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": getattr(settings, "llm_temperature", 0.7),
                "top_p": getattr(settings, "llm_top_p", 0.8),
                "top_k": getattr(settings, "llm_top_k", 20),
                "num_predict": getattr(settings, "llm_max_new_tokens", 300),
            },
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{base_url}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "")

    async def generate_field_guidance(
        self,
        common_name: str,
        scientific_name: str,
        similarity_score: float,
        confidence: float,
        confidence_status: str,
        taxonomy: Optional[Dict[str, Any]] = None,
        top_3_candidates: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point for generating grounded field notes, lookalike warnings,
        and touch-grass sensory directives. Falls back gracefully if LLM is unavailable.
        """
        context, kb_entry, is_fungi = self.build_grounding_context(
            common_name=common_name,
            scientific_name=scientific_name,
            similarity_score=similarity_score,
            confidence=confidence,
            confidence_status=confidence_status,
            taxonomy=taxonomy,
            top_3_candidates=top_3_candidates,
        )

        # Fallback check: if LLM is uninitialized or unavailable
        if not self.is_ready():
            notes, lookalike_warn, tg_prompt = self._generate_static_fallback(
                common_name, scientific_name, confidence_status, kb_entry, is_fungi
            )
            return {
                "field_notes": notes,
                "lookalike_warning": lookalike_warn,
                "touch_grass_prompt": tg_prompt,
                "llm_model": self.model_id,
                "llm_available": False,
            }

        # Attempt LLM generation
        try:
            messages = self.build_prompt_messages(context, confidence_status, is_fungi)
            raw_output = ""

            if self.backend == "ollama":
                raw_output = await self._generate_ollama_text(messages)
            else:
                # Apply chat template with non-thinking flags
                try:
                    prompt_str = self.tokenizer.apply_chat_template(
                        messages,
                        tokenize=False,
                        add_generation_prompt=True,
                        enable_thinking=False,
                    )
                except TypeError:
                    prompt_str = self.tokenizer.apply_chat_template(
                        messages,
                        tokenize=False,
                        add_generation_prompt=True,
                    )

                # Offload to worker thread so FastAPI event loop is never blocked
                raw_output = await asyncio.to_thread(self._run_transformers_generation, prompt_str)

            # Strip <think> blocks as a safety net
            clean_text = strip_think_blocks(raw_output)

            # Extract or format touch-grass prompt and lookalike warning
            lookalikes = kb_entry.get("lookalikes", [])
            lookalike_warn = f"Watch for lookalikes: {'; '.join(lookalikes)}." if lookalikes else None

            # Enforce fungi safety rule: Always append mandatory warning if fungi
            if is_fungi:
                if MUSHROOM_SAFETY_WARNING not in clean_text:
                    clean_text = f"{clean_text}\n\n{MUSHROOM_SAFETY_WARNING}"

            # Extract sensory prompt if present at end, or construct grounded one
            tg_prompt = f"Put your phone away: {kb_entry.get('field_verification_tip', 'Listen for 60 seconds, then observe specimen details with your eyes.')}"

            return {
                "field_notes": clean_text,
                "lookalike_warning": lookalike_warn,
                "touch_grass_prompt": tg_prompt,
                "llm_model": self.model_id,
                "llm_available": True,
            }

        except Exception as e:
            logger.warning(f"LLM generation failed or timed out ({e}). Falling back to static traits.")
            notes, lookalike_warn, tg_prompt = self._generate_static_fallback(
                common_name, scientific_name, confidence_status, kb_entry, is_fungi
            )
            return {
                "field_notes": notes,
                "lookalike_warning": lookalike_warn,
                "touch_grass_prompt": tg_prompt,
                "llm_model": self.model_id,
                "llm_available": False,
            }

    async def generate_mission(self, recent_species: List[str]) -> Dict[str, Any]:
        """
        Generates a personalized touch-grass exploration mission grounded
        exclusively in the species from the user's recent field journal.
        """
        valid_species = [s.strip() for s in recent_species if s.strip()]
        species_list_str = ", ".join(valid_species[:5]) if valid_species else "local temperate woodland flora and fauna"

        # Check if fungi present in recent species
        is_fungi = any("mushroom" in s.lower() or "fung" in s.lower() for s in valid_species)

        fallback_mission = {
            "id": f"mission_journal_{int(time.time())}",
            "title": f"Follow-Up: Signs of {valid_species[0] if valid_species else 'Nature'}",
            "category": "Ecology & Observation",
            "suggested_duration": "5 to 10 minutes",
            "short_objective": f"Explore outdoor micro-habitats where {species_list_str} thrive.",
            "instructions": [
                "Find an outdoor vantage point near trees, soil, or park foliage.",
                f"Look for symbiotic interactions or shelter spots typical for {species_list_str}.",
                "Keep your phone in your pocket for 3 uninterrupted minutes.",
                "Observe ambient moisture, sunlight exposure, and soil composition.",
            ],
            "safety_reminder": (
                f"{MUSHROOM_SAFETY_WARNING} " if is_fungi else ""
            ) + "Observe from a respectful distance. Never disturb wildlife or harvest wild plants.",
            "completion_action": "Log any new animal or insect behaviors noticed near this habitat.",
            "touch_grass_prompt": "Pocket your phone now: listen for wind in the branches for 60 seconds.",
            "llm_model": self.model_id,
            "llm_available": False,
        }

        if not self.is_ready():
            return fallback_mission

        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are WildLens AI's outdoor mission creator. Your goal is to get people to PUT THEIR PHONES AWAY "
                        "and explore the outdoors. GROUNDING: The user recently observed these species: "
                        f"{species_list_str}. Create ONE concise outdoor exploration mission (under 100 words) grounded in these organisms. "
                        "Do not recommend screen time. End with an actionable touch-grass instruction."
                        + (" NEVER suggest eating or harvesting wild mushrooms." if is_fungi else "")
                    ),
                },
                {
                    "role": "user",
                    "content": f"Create a hands-on outdoor field mission based on these recently logged species: {species_list_str}.",
                },
            ]

            raw_text = ""
            if self.backend == "ollama":
                raw_text = await self._generate_ollama_text(messages)
            else:
                try:
                    prompt_str = self.tokenizer.apply_chat_template(
                        messages, tokenize=False, add_generation_prompt=True, enable_thinking=False
                    )
                except TypeError:
                    prompt_str = self.tokenizer.apply_chat_template(
                        messages, tokenize=False, add_generation_prompt=True
                    )
                raw_text = await asyncio.to_thread(self._run_transformers_generation, prompt_str)

            clean_text = strip_think_blocks(raw_text)

            safety = "Observe from a respectful distance. Do not disturb living habitats."
            if is_fungi:
                safety = f"{MUSHROOM_SAFETY_WARNING} {safety}"

            return {
                "id": f"mission_llm_{int(time.time())}",
                "title": f"Field Trail: Tracking {valid_species[0] if valid_species else 'Habitats'}",
                "category": "Behavior & Ecology",
                "suggested_duration": "5 minutes",
                "short_objective": f"Explore outdoor micro-habitats connected with {species_list_str}.",
                "instructions": [
                    p.strip() for p in clean_text.split("\n") if p.strip() and not p.startswith("<")
                ][:4] or fallback_mission["instructions"],
                "safety_reminder": safety,
                "completion_action": "Record the ambient light and moisture conditions in your journal.",
                "touch_grass_prompt": "Pocket your phone: close your eyes and feel the wind direction on your face.",
                "llm_model": self.model_id,
                "llm_available": True,
            }

        except Exception as err:
            logger.warning(f"Failed to generate LLM mission ({err}). Using fallback.")
            return fallback_mission


default_llm_service = LLMService.get_instance()
