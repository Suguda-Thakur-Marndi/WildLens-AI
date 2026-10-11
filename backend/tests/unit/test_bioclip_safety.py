"""
Unit tests for BioCLIP safety guards and curated notes.
Verifies:
1. Mandatory fungi warning is present on every fungi identification.
2. Curated traits fallback to "Not sure. Check leaf edges, bark, habitat, and markings." when not in taxonomy_kb.
3. Old embedding cache rejection when VISION_MODEL_ID changes.
"""

import hashlib
import torch
import pytest
from app.services.bioclip_service import BioClipService, MUSHROOM_SAFETY_WARNING
from app.services.taxonomy_kb import get_curated_traits, TAXONOMY_DATABASE


def test_mandatory_fungi_warning_on_fungi_identification():
    """Verifies that every fungi result includes the mandatory mushroom safety warning."""
    service = BioClipService.get_instance()
    service.load_model()

    # Create dummy image features
    dummy_features = torch.randn(1, 768)
    dummy_features = dummy_features / dummy_features.norm(dim=-1, keepdim=True)

    # Find a fungi taxon in repository
    fungi_candidates = [t for t in service.repository.list_all() if t.get("taxonomy", {}).get("kingdom") == "Fungi"]
    assert len(fungi_candidates) > 0, "No fungi candidates found in taxonomy catalog"
    target_fungi = fungi_candidates[0]

    # Target this fungi index
    fungi_idx = next(i for i, t in enumerate(service.candidate_taxa) if t["id"] == target_fungi["id"])

    # Overwrite dummy features to match this fungi embedding exactly
    target_embedding = service.candidate_features[fungi_idx:fungi_idx+1].clone()

    res = service.identify_embedding(target_embedding)

    # Assert mandatory safety warning presence
    assert res.primary_candidate.taxonomy.kingdom == "Fungi"
    assert "never eat wild mushrooms" in res.safety_and_ethics_reminder.lower()
    assert "never eat wild mushrooms" in (res.uncertainty_warning or "").lower()

    # Also assert distinguishing features contains the safety guard
    assert any("never eat wild mushrooms" in f.lower() for f in res.primary_candidate.distinguishing_features)


def test_curated_notes_fallback_when_species_not_in_kb():
    """
    Verifies that if an identified species has no entry in taxonomy_kb,
    it returns the generic prompt and never fabricates traits.
    """
    traits = get_curated_traits("Nonexistent species", "Nonexistentus fakeus")
    assert traits["distinguishing_features"] == ["Not sure. Check leaf edges, bark, habitat, and markings."]
    assert traits["lookalikes"] == []
    assert traits["field_verification_tip"] == "Check leaf edges, bark, habitat, and markings."


def test_curated_notes_returns_factual_traits_for_verified_species():
    """Verifies verified species return authentic botanical/zoological traits."""
    traits = get_curated_traits("Fly Agaric", "Amanita muscaria")
    assert any("bright scarlet" in f.lower() or "white pyramidal warts" in f.lower() for f in traits["distinguishing_features"])
    assert any("never consume" in f.lower() for f in traits["distinguishing_features"])


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
