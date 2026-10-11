"""
Unit tests for BioCLIP safety guards and curated notes.
Verifies:
1. Mandatory fungi warning is present on every fungi identification.
2. Curated traits fallback to "Not sure. Check leaf edges, bark, habitat, and markings." when not in taxonomy_kb.
3. Old embedding cache rejection when VISION_MODEL_ID changes.
"""

import hashlib
import unittest.mock as mock
from pathlib import Path

import torch

from app.services.bioclip_service import BioClipService
from app.services.taxonomy_kb import get_curated_traits

SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_images"


def _ensure_service_ready(service: BioClipService) -> None:
    """Ensure BioCLIP service is ready, mocking model tensors if weights are not cached locally."""
    try:
        service.load_model()
    except Exception:
        pass

    if service.status != "ready" or service.model is None or service.text_features is None:
        service.candidate_taxa = service.repository.list_all()
        dim = 768
        service.embedding_dim = dim
        service.device = "cpu"
        service.precision = "fp32"
        service.status = "ready"

        taxa_feats = torch.randn(len(service.candidate_taxa), dim)
        taxa_feats = taxa_feats / taxa_feats.norm(dim=-1, keepdim=True)
        fly_agaric_idx = next(
            (i for i, t in enumerate(service.candidate_taxa) if "fly agaric" in t["common_name"].lower()),
            0,
        )
        service.text_features = taxa_feats

        mock_model = mock.MagicMock()
        mock_model.encode_image.return_value = taxa_feats[fly_agaric_idx : fly_agaric_idx + 1].clone()
        mock_model.encode_text.side_effect = lambda toks: torch.randn(toks.shape[0], dim)
        mock_model.logit_scale.exp.return_value = torch.tensor(100.0)
        service.model = mock_model
        service.preprocess = lambda img: torch.zeros(3, 224, 224)
        service.tokenizer = lambda prompts: torch.zeros(len(prompts), 77, dtype=torch.long)


def test_mandatory_fungi_warning_on_fungi_identification():
    """Verifies that every fungi result includes the mandatory mushroom safety warning."""
    service = BioClipService.get_instance()
    _ensure_service_ready(service)

    mushroom_img_path = SAMPLE_DIR / "fly_agaric_mushroom.jpg"
    assert mushroom_img_path.exists(), f"Sample fungi image missing at {mushroom_img_path}"

    with open(mushroom_img_path, "rb") as f:
        res = service.identify_image(f.read())

    # Assert mandatory safety warning presence
    assert res.primary_candidate.taxonomy.kingdom == "Fungi"
    assert "never eat wild mushrooms" in res.safety_and_ethics_reminder.lower()
    assert res.uncertainty_warning is not None
    assert "never eat wild mushrooms" in res.uncertainty_warning.lower()

    # Also assert distinguishing features contains the safety guard
    assert any("never eat wild mushrooms" in f.lower() for f in res.primary_candidate.distinguishing_features)


def test_curated_notes_fallback_when_species_not_in_kb():
    """
    Verifies that if an identified species has no entry in taxonomy_kb,
    it returns the generic prompt and never fabricates traits.
    """
    traits = get_curated_traits("Nonexistentus fakeus")
    assert traits["has_curated_entry"] is False
    assert traits["distinguishing_features"] == ["Not sure. Check leaf edges, bark, habitat, and markings."]
    assert traits["lookalikes"] == []
    assert traits["field_verification_tip"] == "Not sure. Check leaf edges, bark, habitat, and markings."


def test_curated_notes_returns_factual_traits_for_verified_species():
    """Verifies verified species return authentic botanical/zoological traits."""
    traits = get_curated_traits("Fly Agaric")
    assert traits["has_curated_entry"] is True
    assert any("highly toxic" in f.lower() or "ibotenic acid" in f.lower() for f in traits["distinguishing_features"])
    assert any("scarlet" in c.lower() for c in traits["visual_characteristics"])


def test_embedding_cache_rejected_on_model_id_change(tmp_path):
    """
    Verifies that when VISION_MODEL_ID changes or dimension changes,
    the old embedding cache file is rejected and rebuilt.
    """
    service = BioClipService.get_instance()
    _ensure_service_ready(service)

    orig_cache_dir = service.cache_dir
    try:
        service.cache_dir = tmp_path
        candidate_taxa = service.repository.list_all()
        ids_hash = hashlib.sha256("".join(t["id"] for t in candidate_taxa).encode("utf-8")).hexdigest()[:12]
        cache_file = service._get_cache_path(ids_hash)

        # Write an old cache with different model identifier
        old_embeddings = torch.randn(len(candidate_taxa), 512)
        old_embeddings = old_embeddings / old_embeddings.norm(dim=-1, keepdim=True)
        torch.save(
            {
                "model_identifier": "imageomics/bioclip-old",
                "embedding_dim": 512,
                "ids_hash": ids_hash,
                "candidate_ids": [t["id"] for t in candidate_taxa],
                "embeddings": old_embeddings,
            },
            cache_file,
        )

        # Calling _precompute_taxa_embeddings must reject the old cache
        service._precompute_taxa_embeddings()

        assert service.embedding_dim == 768
        assert service.candidate_features.shape == (len(candidate_taxa), 768)

        # Verify rebuilt cache on disk has the new model ID
        rebuilt = torch.load(cache_file, weights_only=False)
        assert rebuilt["model_identifier"] == service.model_id
        assert rebuilt["embedding_dim"] == 768
    finally:
        service.cache_dir = orig_cache_dir
        service._precompute_taxa_embeddings()
