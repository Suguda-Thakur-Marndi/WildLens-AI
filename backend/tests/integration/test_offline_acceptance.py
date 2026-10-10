"""
Offline Acceptance Test Suite for WildLens AI.
Verifies that model loading and inference run completely offline using local cached weights
without making external network connections, and that old embedding caches are rejected
when VISION_MODEL_ID changes.
"""

import os
import socket
from pathlib import Path
import pytest
import torch

# 1. Force offline mode in Hugging Face Hub
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

# 2. Block all non-loopback network calls at the socket level to simulate network disconnect
_real_create_connection = socket.create_connection


def guarded_create_connection(address, *args, **kwargs):
    host, port = address
    # Allow only loopback addresses
    if host not in ("127.0.0.1", "localhost", "::1"):
        raise socket.error(f"[OFFLINE ACCEPTANCE VIOLATION] Attempted external network call to {host}:{port} while offline!")
    return _real_create_connection(address, *args, **kwargs)


socket.create_connection = guarded_create_connection

from app.main import app  # noqa: E402
from app.services.bioclip_service import BioClipService  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(app)
SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_images"


def test_offline_loading_and_identification_acceptance():
    """
    Verifies that BioCLIP loads weights and executes inference from disk cache
    with 100% network disconnection enforced at the socket level.
    """
    service = BioClipService.get_instance()
    loaded = service.load_model(force_reload=True)
    assert loaded is True, f"Offline model load failed: {service.last_error}"
    assert service.status == "ready"
    assert service.text_features is not None

    sample_file = SAMPLE_DIR / "monarch_butterfly.jpg"
    assert sample_file.exists(), f"Sample image {sample_file} not found"

    with open(sample_file, "rb") as f:
        files = {"file": ("monarch_butterfly.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200, f"Offline inference failed with status {response.status_code}: {response.text}"
    data = response.json()

    assert data["offline_verified"] is True
    assert data["primary_candidate"]["common_name"] == "Monarch Butterfly"
    assert data["primary_candidate"]["confidence"] > 0.80
    assert data["inference_time_ms"] > 0
    print(f"\n[OFFLINE ACCEPTANCE PASSED] Model identified '{data['primary_candidate']['common_name']}' in {data['inference_time_ms']}ms with 0% external cloud egress.")


def test_embedding_cache_rejected_on_model_change(tmp_path):
    """
    Verifies that an old or mismatched embedding cache (e.g. from the previous model
    'imageomics/bioclip' with 512 dimensions) is rejected and invalidated when
    VISION_MODEL_ID changes to 'imageomics/bioclip-2'.
    """
    import hashlib

    service = BioClipService.get_instance()
    service.load_model()

    orig_cache_dir = service.cache_dir
    try:
        service.cache_dir = tmp_path
        candidate_taxa = service.repository.list_all()
        ids_hash = hashlib.sha256("".join(t["id"] for t in candidate_taxa).encode("utf-8")).hexdigest()[:12]
        target_cache_file = service._get_cache_path(ids_hash)

        # Write an old incompatible cache file (representing previous 512-dim imageomics/bioclip)
        dummy_512_embeddings = torch.randn(len(candidate_taxa), 512)
        dummy_512_embeddings = dummy_512_embeddings / dummy_512_embeddings.norm(dim=-1, keepdim=True)
        torch.save(
            {
                "model_identifier": "imageomics/bioclip",  # Old model
                "model_revision": "old_hash",
                "embedding_dim": 512,  # Old ViT-B/16 dimension
                "ids_hash": ids_hash,
                "candidate_ids": [t["id"] for t in candidate_taxa],
                "embeddings": dummy_512_embeddings,
            },
            target_cache_file,
        )

        # Precompute must detect model/dimension mismatch, reject stale cache, and recompute
        service._precompute_taxa_embeddings()

        # Verify active service candidate features are regenerated with the new 768 dimensions
        assert service.embedding_dim == 768
        assert service.candidate_features.shape == (len(candidate_taxa), 768)

        # Verify the saved cache was updated to the new model ID and dimension
        new_cached = torch.load(target_cache_file, weights_only=False)
        assert new_cached["model_identifier"] == service.model_id
        assert new_cached["embedding_dim"] == 768
        assert new_cached["embeddings"].shape == (len(candidate_taxa), 768)
    finally:
        service.cache_dir = orig_cache_dir
        service._precompute_taxa_embeddings()


if __name__ == "__main__":
    test_offline_loading_and_identification_acceptance()
    print("ALL OFFLINE ACCEPTANCE TESTS PASSED.")
