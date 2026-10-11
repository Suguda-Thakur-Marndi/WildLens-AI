"""
Unit tests for BioCLIP safety guards and curated notes.
Verifies:
1. Mandatory fungi warning is present on every fungi identification.
2. Curated traits fallback to "Not sure. Check leaf edges, bark, habitat, and markings." when not in taxonomy_kb.
3. Old embedding cache rejection when VISION_MODEL_ID changes.
"""

import hashlib
from pathlib import Path

import torch

from app.services.bioclip_service import BioClipService
from app.services.taxonomy_kb import get_curated_traits

SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_images"


def test_mandatory_fungi_warning_on_fungi_identification():
    """Verifies that every fungi result includes the mandatory mushroom safety warning."""
    service = BioClipService.get_instance()
    service.load_model()

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
    service.load_model()

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
