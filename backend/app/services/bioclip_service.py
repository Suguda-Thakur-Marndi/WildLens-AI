import hashlib
import logging
import os
from pathlib import Path
import threading
import time
from typing import Any, Dict, List, Optional

import torch

from app.core.config import settings
from app.core.exceptions import InferenceExecutionError, ModelNotReadyError
from app.repositories.taxonomy_repository import TaxonomyRepository, default_taxonomy_repository
from app.schemas.identification import (
    CandidateSpecies,
    IdentificationResponse,
    ModelStatusResponse,
    TaxonomicHierarchy,
)
from app.utils.image_processing import validate_and_decode_image

logger = logging.getLogger("wildlens.bioclip")


class BioClipService:
    _instance: Optional["BioClipService"] = None

    def __init__(self, repository: Optional[TaxonomyRepository] = None):
        self.repository = repository or default_taxonomy_repository
        self.model = None
        self.preprocess = None
        self.tokenizer = None
        self.text_features: Optional[torch.Tensor] = None
        self.candidate_taxa: List[Dict[str, Any]] = []
        self.status: str = "uninitialized"
        self.last_error: Optional[str] = None
        self.load_time_seconds: Optional[float] = None
        self._lock = threading.Lock()

        # Dynamic model configuration
        self.model_id = os.getenv(
            "VISION_MODEL_ID",
            getattr(settings, "model_identifier", "imageomics/bioclip-2")
        )
        self.cache_dir = Path(
            os.getenv("MODEL_CACHE_DIR", str(getattr(settings, "model_cache_dir", Path("models/bioclip_cache"))))
        )
        self.target_device_setting = os.getenv(
            "VISION_DEVICE",
            getattr(settings, "vision_device", "auto")
        ).lower()

        self.device = "cpu"
        self.precision = "fp32"
        self.embedding_dim = 768
        self.expected_image_size = None

    @classmethod
    def get_instance(cls) -> "BioClipService":
        if cls._instance is None:
            cls._instance = BioClipService()
        return cls._instance

    @property
    def candidate_features(self):
        return self.text_features

    def _determine_device_and_precision(self) -> tuple[str, str]:
        """
        Determines target device and floating point precision based on VISION_DEVICE (auto|cuda|cpu)
        and available hardware telemetry. If sharing 8GB GPU with Qwen3-8B (4-bit), reserves VRAM
        and falls back to CPU if memory is insufficient.
        """
        setting = self.target_device_setting
        if setting == "cpu":
            return "cpu", "fp32"

        if not torch.cuda.is_available():
            if setting == "cuda":
                logger.warning("VISION_DEVICE='cuda' requested, but CUDA is not available. Falling back to CPU.")
            return "cpu", "fp32"

        # Check VRAM headroom on CUDA device
        try:
            free_vram, total_vram = torch.cuda.mem_get_info()
            # BioCLIP-2 in fp16 requires ~850MB-1.2GB VRAM.
            # Qwen3-8B in 4-bit NF4 requires ~5.5GB VRAM.
            # If free VRAM is under 1.0GB, fall back to CPU to prevent CUDA OOM.
            min_free_vram_bytes = 1024 * 1024 * 1024  # 1 GB
            if setting == "auto" and free_vram < min_free_vram_bytes:
                logger.warning(
                    f"Insufficient free VRAM for BioCLIP-2 ({free_vram / (1024 * 1024):.1f} MB free out of {total_vram / (1024 * 1024):.1f} MB). "
                    "Falling back to CPU to preserve GPU memory for Qwen3-8B language layer."
                )
                return "cpu", "fp32"
        except Exception as vram_err:
            logger.warning(f"Could not query CUDA memory info ({vram_err}). Proceeding with CUDA.")

        return "cuda", "fp16"

    def get_status(self) -> ModelStatusResponse:
        vision_mem_mb = None
        if torch.cuda.is_available() and self.device == "cuda":
            vision_mem_mb = round(torch.cuda.memory_allocated() / (1024 * 1024), 2)

        # Pull Language Layer telemetry for unified system status
        llm_status = None
        llm_device = None
        llm_mem_mb = None
        llm_model_id = "Qwen/Qwen3-8B"
        llm_license = "Apache-2.0"
        try:
            from app.services.llm_service import LLMService
            llm_info = LLMService.get_instance().get_status_info()
            llm_status = llm_info.get("status")
            llm_device = llm_info.get("device")
            llm_mem_mb = llm_info.get("memory_usage_mb")
            llm_model_id = llm_info.get("model_id", "Qwen/Qwen3-8B")
        except Exception:
            pass

        return ModelStatusResponse(
            status=self.status,
            model_name=self.model_id,
            model_revision=settings.model_revision,
            model_license=settings.model_license,
            device=self.device,
            cache_directory=str(self.cache_dir),
            supported_taxa_count=self.repository.count(),
            memory_usage_mb=vision_mem_mb,
            offline_capable=True,
            vision_model_id=self.model_id,
            vision_model_license=settings.model_license,
            vision_device=self.device,
            vision_memory_mb=vision_mem_mb,
            llm_model_id=llm_model_id,
            llm_model_license=llm_license,
            llm_status=llm_status,
            llm_device=llm_device,
            llm_memory_mb=llm_mem_mb,
        )

    def load_model(self, force_reload: bool = False) -> bool:
        with self._lock:
            # Refresh config in case VISION_MODEL_ID or VISION_DEVICE changed in environment
            self.model_id = os.getenv(
                "VISION_MODEL_ID",
                getattr(settings, "model_identifier", "imageomics/bioclip-2")
            )
            self.cache_dir = Path(
                os.getenv("MODEL_CACHE_DIR", str(getattr(settings, "model_cache_dir", Path("models/bioclip_cache"))))
            )
            self.target_device_setting = os.getenv(
                "VISION_DEVICE",
                getattr(settings, "vision_device", "auto")
            ).lower()

            if self.status == "ready" and not force_reload and self.model is not None:
                return True

            self.status = "loading"
            start_time = time.time()

            # Ensure offline lock and enforce local_files_only when cache directory exists
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            if self.cache_dir.exists() or os.getenv("HF_HUB_OFFLINE") == "1":
                os.environ["HF_HUB_OFFLINE"] = "1"
                os.environ["TRANSFORMERS_OFFLINE"] = "1"
                try:
                    import huggingface_hub
                    import huggingface_hub.constants
                    huggingface_hub.constants.HF_HUB_OFFLINE = True

                    # Intercept hf_hub_download to ensure local_files_only=True without network egress
                    _real_download = huggingface_hub.hf_hub_download

                    def _offline_guarded_download(*args, **kwargs):
                        kwargs["local_files_only"] = True
                        return _real_download(*args, **kwargs)

                    huggingface_hub.hf_hub_download = _offline_guarded_download
                except Exception:
                    pass

            target_device, target_precision = self._determine_device_and_precision()
            self.device = target_device
            self.precision = target_precision

            logger.info(
                f"Loading BioCLIP model '{self.model_id}' on device '{self.device}' "
                f"(precision={self.precision}, cache={self.cache_dir})..."
            )

            try:
                import open_clip

                # Attempt model instantiation on selected device
                try:
                    model, preprocess_train, preprocess_val = open_clip.create_model_and_transforms(
                        f"hf-hub:{self.model_id}",
                        device=self.device,
                        precision=self.precision,
                        cache_dir=str(self.cache_dir),
                    )
                    tokenizer = open_clip.get_tokenizer(
                        f"hf-hub:{self.model_id}",
                        cache_dir=str(self.cache_dir),
                    )
                except (RuntimeError, torch.cuda.OutOfMemoryError) as oom_err:
                    if self.device == "cuda":
                        logger.warning(
                            f"CUDA allocation failed for '{self.model_id}' ({oom_err}). "
                            "Gracefully falling back to CPU runtime to prevent crash."
                        )
                        torch.cuda.empty_cache()
                        self.device = "cpu"
                        self.precision = "fp32"
                        model, preprocess_train, preprocess_val = open_clip.create_model_and_transforms(
                            f"hf-hub:{self.model_id}",
                            device="cpu",
                            precision="fp32",
                            cache_dir=str(self.cache_dir),
                        )
                        tokenizer = open_clip.get_tokenizer(
                            f"hf-hub:{self.model_id}",
                            cache_dir=str(self.cache_dir),
                        )
                    else:
                        raise

                model.eval()
                self.model = model
                self.preprocess = preprocess_val
                self.tokenizer = tokenizer

                # Determine dynamic embedding dimension from vision backbone
                if hasattr(model.visual, "output_dim"):
                    self.embedding_dim = model.visual.output_dim
                elif hasattr(model, "text_projection") and model.text_projection is not None:
                    self.embedding_dim = model.text_projection.shape[1]
                else:
                    self.embedding_dim = 768

                self.expected_image_size = getattr(model.visual, "image_size", 224)
                logger.info(
                    f"BioCLIP model '{self.model_id}' initialized: expected_image_size={self.expected_image_size}, "
                    f"embedding_dim={self.embedding_dim}, transform={self.preprocess}"
                )

                # Precompute and validate taxonomy embeddings
                self._precompute_taxa_embeddings()
                if self.text_features is not None:
                    assert self.text_features.shape[1] == self.embedding_dim, (
                        f"Expected {self.embedding_dim}-dimensional candidate embeddings, got {self.text_features.shape[1]}"
                    )

                self.load_time_seconds = round(time.time() - start_time, 2)
                self.status = "ready"
                self.last_error = None

                # Log device landing for both vision and language models
                logger.info(
                    f"Vision model '{self.model_id}' landed on device '{self.device}' "
                    f"(precision: {self.precision}, load_time: {self.load_time_seconds}s)."
                )
                try:
                    from app.services.llm_service import LLMService
                    llm_inst = LLMService.get_instance()
                    logger.info(
                        f"Language model '{llm_inst.model_id}' status: '{llm_inst.status}' "
                        f"on device '{llm_inst.device}'."
                    )
                except Exception:
                    pass

                return True

            except Exception as e:
                self.status = "error"
                self.last_error = str(e)
                logger.error(f"Failed to load BioCLIP model: {e}", exc_info=True)
                return False

    def _get_cache_path(self, ids_hash: str) -> Path:
        model_slug = self.model_id.replace("/", "_").replace(":", "_")
        rev_prefix = settings.model_revision[:12] if settings.model_revision else "latest"
        return self.cache_dir / f"taxa_embeddings_{model_slug}_{self.embedding_dim}_{rev_prefix}_{ids_hash}.pt"

    def _precompute_taxa_embeddings(self) -> None:
        self.candidate_taxa = self.repository.list_all()
        candidate_ids = [t["id"] for t in self.candidate_taxa]
        ids_hash = hashlib.sha256("".join(candidate_ids).encode("utf-8")).hexdigest()[:12]
        cache_path = self._get_cache_path(ids_hash)

        # Check for valid on-disk candidate embeddings cache matching the ACTIVE model ID
        if cache_path.exists():
            try:
                cached_data = torch.load(cache_path, map_location=self.device, weights_only=False)
                if (
                    isinstance(cached_data, dict)
                    and cached_data.get("model_identifier") == self.model_id
                    and cached_data.get("embedding_dim") == self.embedding_dim
                    and cached_data.get("ids_hash") == ids_hash
                    and "embeddings" in cached_data
                    and cached_data["embeddings"].shape == (len(self.candidate_taxa), self.embedding_dim)
                ):
                    loaded_feats = cached_data["embeddings"].to(self.device)
                    if self.precision == "fp16":
                        loaded_feats = loaded_feats.half()
                    self.text_features = loaded_feats
                    logger.info(
                        f"Loaded validated candidate embeddings for '{self.model_id}' from cache: {cache_path} "
                        f"(shape={self.text_features.shape}, dim={self.embedding_dim})."
                    )
                    return
                else:
                    logger.warning(
                        f"Cache {cache_path} rejected due to model identity ({cached_data.get('model_identifier')} vs {self.model_id}) "
                        f"or dimension mismatch ({cached_data.get('embedding_dim')} vs {self.embedding_dim}). Regenerating..."
                    )
            except Exception as cache_err:
                logger.warning(f"Failed reading cache {cache_path}: {cache_err}. Regenerating...")

        # Recompute text embeddings with the new model
        logger.info(f"Recomputing taxonomy text embeddings for {len(self.candidate_taxa)} taxa using '{self.model_id}'...")
        templates_per_taxon = self.repository.generate_lineage_templates()
        t1_prompts = [t[0] for t in templates_per_taxon]
        t2_prompts = [t[1] for t in templates_per_taxon]

        with torch.inference_mode():
            toks_1 = self.tokenizer(t1_prompts).to(self.device)
            f_1 = self.model.encode_text(toks_1)
            f_1 = f_1 / f_1.norm(dim=-1, keepdim=True)

            toks_2 = self.tokenizer(t2_prompts).to(self.device)
            f_2 = self.model.encode_text(toks_2)
            f_2 = f_2 / f_2.norm(dim=-1, keepdim=True)

            combined = (f_1 + f_2) / 2.0
            combined = combined / combined.norm(dim=-1, keepdim=True)

            if self.precision == "fp16":
                combined = combined.half()

        self.text_features = combined

        # Save validated cache with model identity, dimension, and revision metadata
        try:
            cache_payload = {
                "model_identifier": self.model_id,
                "model_revision": settings.model_revision,
                "embedding_dim": self.embedding_dim,
                "ids_hash": ids_hash,
                "candidate_ids": candidate_ids,
                "embeddings": self.text_features.detach().cpu().float(),
            }
            torch.save(cache_payload, cache_path)
            logger.info(f"Persisted candidate embeddings cache for '{self.model_id}' (dim={self.embedding_dim}) to {cache_path}.")
        except Exception as save_err:
            logger.warning(f"Could not persist candidate embeddings to cache: {save_err}")

    def identify_image(self, image_bytes: bytes) -> IdentificationResponse:
        if self.status != "ready" or self.model is None or self.preprocess is None or self.text_features is None:
            loaded = self.load_model()
            if not loaded:
                raise ModelNotReadyError(
                    f"BioCLIP model is not ready (Status: {self.status}). Error: {self.last_error or 'Weights uninitialized'}"
                )

        image = validate_and_decode_image(image_bytes)

        start_inference = time.time()
        try:
            with self._lock:
                image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
                if self.precision == "fp16":
                    image_tensor = image_tensor.half()

                with torch.inference_mode():
                    image_features = self.model.encode_image(image_tensor)
                    image_features = image_features / image_features.norm(dim=-1, keepdim=True)

                    assert image_features.shape[1] == self.embedding_dim, (
                        f"Expected {self.embedding_dim}-dimensional image embeddings, got {image_features.shape[1]}"
                    )

                    # 1. Calculate raw cosine similarity across candidate embedding matrix
                    raw_cosine_sim = (image_features @ self.text_features.T).squeeze(0)
                    cosine_scores = raw_cosine_sim.cpu().float().numpy().tolist()

                    # 2. Calculate logit_scale softmax probabilities: softmax(model.logit_scale.exp() * cosine)
                    scale = self.model.logit_scale.exp().item() if hasattr(self.model, "logit_scale") else 100.0
                    softmax_probs = (
                        (scale * image_features @ self.text_features.T).softmax(dim=-1)[0].cpu().float().numpy().tolist()
                    )

        except Exception as e:
            raise InferenceExecutionError(f"Tensor inference forward pass failed: {e}") from e

        inference_ms = round((time.time() - start_inference) * 1000, 1)

        # Sort candidate indices by raw cosine similarity
        ranked_indices = sorted(range(len(cosine_scores)), key=lambda i: cosine_scores[i], reverse=True)

        primary_idx = ranked_indices[0]
        runner_up_idx = ranked_indices[1] if len(ranked_indices) > 1 else None
        primary_entry = self.candidate_taxa[primary_idx]
        primary_similarity = float(cosine_scores[primary_idx])

        top1_prob = float(softmax_probs[primary_idx])
        top2_prob = float(softmax_probs[runner_up_idx]) if runner_up_idx is not None else 0.0
        prob_margin = top1_prob - top2_prob

        ood_threshold = float(getattr(settings, "out_of_distribution_threshold", 0.60))

        # Build top-k candidate species (top 5 evaluated candidates)
        top_k_predictions: List[CandidateSpecies] = []
        for idx in ranked_indices[:5]:
            entry = self.candidate_taxa[idx]
            sim = round(float(cosine_scores[idx]), 4)
            prob = round(float(softmax_probs[idx]), 4)

            top_k_predictions.append(
                CandidateSpecies(
                    common_name=entry["common_name"],
                    scientific_name=entry["scientific_name"],
                    taxonomic_rank="species",
                    similarity_score=sim,
                    softmax_density=prob,
                    confidence=prob,  # Closed-set softmax probability across candidate catalog
                    taxonomy=TaxonomicHierarchy(**entry["taxonomy"]),
                    visual_characteristics=entry.get("visual_characteristics", []),
                    distinguishing_features=entry.get("distinguishing_features", []),
                    lookalikes=entry.get("lookalikes", []),
                    habitat_notes=entry.get("habitat_notes", ""),
                    field_verification_tip=entry.get("field_verification_tip", ""),
                )
            )

        # Margin Logic & OOD rejection calibrated for BioCLIP-2 ViT-L/14:
        # - If max cosine is below configurable threshold (default 0.60): return "Not in my database"
        # - "Confident": similarity >= 0.65 AND top1_prob >= 0.60 AND prob_margin >= 0.25
        # - "Possible match": similarity >= 0.60 AND top1_prob >= 0.35
        # - otherwise "Uncertain: verify these features outdoors" and show top candidate alternatives.
        if primary_similarity < ood_threshold:
            confidence_status = "inconclusive"
            uncertainty_rating = "inconclusive"
            display_common_name = "Not in my database"
            display_scientific_name = "Subject not recognized in candidate catalog"
            uncertainty_warning = (
                f"Not in my database. The highest BioCLIP-2 visual similarity is {round(primary_similarity, 4)}, "
                f"which is below the candidate acceptance threshold ({ood_threshold:.2f}). "
                f"The organism is unrepresented in the candidate catalog ({len(self.candidate_taxa)} taxa). "
                "Nearest mathematical matches are tentative nearest neighbors only."
            )
            primary_candidate = None
            alternative_candidates = top_k_predictions
        elif primary_similarity >= 0.65 and top1_prob >= 0.60 and prob_margin >= 0.25:
            confidence_status = "confident"
            uncertainty_rating = "confident"
            uncertainty_warning = None
            display_common_name = primary_entry["common_name"]
            display_scientific_name = primary_entry["scientific_name"]
            primary_candidate = top_k_predictions[0]
            alternative_candidates = top_k_predictions[1:]
        elif primary_similarity >= 0.60 and top1_prob >= 0.35 and prob_margin >= 0.10:
            confidence_status = "moderate"
            uncertainty_rating = "moderate"
            uncertainty_warning = (
                f"Possible match: {primary_entry['common_name']} (Visual similarity: {round(primary_similarity, 4)}). "
                f"Candidate probability margin is {round(prob_margin * 100, 1)}%. "
                "Examine distinguishing field marks in the field to verify."
            )
            display_common_name = primary_entry["common_name"]
            display_scientific_name = primary_entry["scientific_name"]
            primary_candidate = top_k_predictions[0]
            alternative_candidates = top_k_predictions[1:]
        else:
            confidence_status = "uncertain"
            uncertainty_rating = "uncertain"
            uncertainty_warning = (
                f"Uncertain: verify these features outdoors. Top visual similarity is {round(primary_similarity, 4)} "
                f"with a narrow margin ({round(prob_margin * 100, 1)}%) to lookalikes. "
                "Compare the top candidate matches below."
            )
            display_common_name = "Uncertain identification"
            display_scientific_name = f"Tentative: {primary_entry['common_name']} ({primary_entry['scientific_name']})"
            primary_candidate = top_k_predictions[0]
            alternative_candidates = top_k_predictions[1:]

        inspection_prompts = [
            f"Check key trait: {primary_entry.get('field_verification_tip', 'Inspect morphology.')}",
            f"Look for distinguishing marker: {primary_entry['distinguishing_features'][0] if primary_entry.get('distinguishing_features') else 'Observe specimen.'}",
            "Step back and observe behavior and habitat: note tree species, sunlight level, or flight style without disturbing the subject.",
        ]

        return IdentificationResponse(
            common_name=display_common_name,
            scientific_name=display_scientific_name,
            similarity_score=round(primary_similarity, 4),
            softmax_density=round(top1_prob, 4),
            calibrated_probability=None,
            catalog_scope=f"{len(self.candidate_taxa)} curated temperate woodland taxa",
            confidence_status=confidence_status,
            model_name=self.model_id,
            model_version=settings.model_revision,
            candidate_count=len(self.candidate_taxa),
            top_k_predictions=top_k_predictions,
            primary_candidate=primary_candidate,
            alternative_candidates=alternative_candidates,
            uncertainty_rating=uncertainty_rating,
            uncertainty_warning=uncertainty_warning,
            suggested_outdoor_inspection=inspection_prompts,
            safety_and_ethics_reminder=(
                "Touch Grass Principle: Observe from a respectful distance. Never touch unknown wild fungi, insects, or plants with defensive toxins. Do not feed or disturb wildlife."
            ),
            inference_time_ms=inference_ms,
            model_identifier=self.model_id,
            offline_verified=True,
        )
