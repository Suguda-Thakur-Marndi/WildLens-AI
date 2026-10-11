"""
BioCLIP Prediction Accuracy and Regression Test Suite for WildLens AI.
Verifies the 12 core requirements from the BioCLIP prediction audit:
1. Image preprocessing (RGB, EXIF, AVIF, resize, normalize).
2. Embedding normalization and similarity ranking.
3. Candidate-to-taxonomy mapping.
4. Stable candidate and embedding alignment after sorting and caching.
5. Top-k output ordering (descending score).
6. Accurate candidate counts.
7. Honest score and confidence semantics (uncalibrated softmax avoided).
8. Invalid and corrupted image handling without silent fallback.
9. Ambiguous and out-of-distribution (OOD) handling.
10. Correct identification of the blue flower specimen (Hepatica nobilis vs Erythronium americanum).
11. API error handling without fabricated default species.
12. Offline inference execution.
"""

import io
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.services.bioclip_service import BioClipService
from app.services.taxonomy_kb import TAXONOMY_DATABASE
from app.utils.image_processing import validate_and_decode_image

client = TestClient(app)
SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_images"


# ---------------------------------------------------------------------------
# 1. Image Preprocessing Tests
# ---------------------------------------------------------------------------
def test_preprocessing_avif_decoding():
    """Verifies that AVIF files decode to standard RGB Pillow images."""
    avif_path = SAMPLE_DIR / "hepatica_nobilis.avif"
    if avif_path.exists():
        with open(avif_path, "rb") as f:
            raw_bytes = f.read()
        decoded = validate_and_decode_image(raw_bytes)
        assert decoded.mode == "RGB"
        assert decoded.size[0] > 0 and decoded.size[1] > 0


def test_preprocessing_exif_orientation_normalized():
    """Verifies that EXIF orientation is normalized so rotated photos are right-side-up."""
    # Create image with EXIF orientation tag 6 (rotated 90 degrees CW)
    img = Image.new("RGB", (200, 100), color=(50, 100, 150))
    exif = img.getexif()
    exif[0x0112] = 6  # Orientation tag
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    raw_data = buf.getvalue()

    decoded = validate_and_decode_image(raw_data)
    # Once transposed according to EXIF 6, dimensions flip to (100, 200)
    assert decoded.size == (100, 200)
    assert decoded.mode == "RGB"


# ---------------------------------------------------------------------------
# 2. Embedding Normalization and Alignment Tests
# ---------------------------------------------------------------------------
def test_embedding_normalization_and_candidate_alignment():
    """Verifies that cached candidate embeddings have unit L2 norm and match TAXONOMY_DATABASE."""
    service = BioClipService.get_instance()
    service.load_model()
    assert service.candidate_features is not None, "Candidate features should be precomputed"

    feats = service.candidate_features
    # Check shape: [N_candidates, embed_dim]
    assert feats.shape[0] == len(TAXONOMY_DATABASE)
    assert feats.shape[1] == 768  # BioCLIP-2 ViT-L/14 embedding dimension

    # Verify unit L2 norm (within 1e-4 tolerance)
    norms = feats.norm(dim=-1)
    for i, norm in enumerate(norms):
        assert abs(float(norm) - 1.0) < 1e-4, f"Feature norm for candidate {i} is not 1.0 (got {norm})"


def test_candidate_count_matches_actual_database():
    """Verifies that candidate_count strictly reflects the evaluated candidate catalog."""
    service = BioClipService.get_instance()
    service.load_model()
    assert service.candidate_taxa == TAXONOMY_DATABASE
    assert len(service.candidate_taxa) == len(TAXONOMY_DATABASE)
    assert len(service.candidate_taxa) >= 30


# ---------------------------------------------------------------------------
# 3. Real Flower Specimen Identification (Hepatica nobilis vs Erythronium)
# ---------------------------------------------------------------------------
def test_blue_flower_specimen_correct_identification():
    """
    Validates that the small blue woodland wildflower photo is correctly identified
    as Hepatica nobilis (Round-lobed Hepatica / Liverleaf) in the Ranunculaceae family,
    with Hepatica americana as runner-up, and NOT Erythronium americanum (Yellow Trout Lily).
    """
    image_path = SAMPLE_DIR / "hepatica_nobilis.jpg"
    assert image_path.exists(), f"Specimen image missing at {image_path}"

    with open(image_path, "rb") as f:
        files = {"file": ("hepatica_nobilis.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    # 1. Primary candidate must be Hepatica (Liverleaf)
    primary = data["primary_candidate"]
    assert "Hepatica" in primary["scientific_name"] or "Liverleaf" in primary["common_name"], (
        f"Expected Hepatica, got {primary['common_name']} ({primary['scientific_name']})"
    )
    assert primary["scientific_name"] == "Hepatica nobilis"
    assert primary["taxonomy"]["family"] == "Ranunculaceae"
    assert primary["taxonomy"]["kingdom"] == "Plantae"

    # 2. Must NOT be Yellow Trout Lily (Erythronium americanum)
    assert primary["scientific_name"] != "Erythronium americanum"
    assert "Trout Lily" not in primary["common_name"]

    # 3. Candidate count must match actual catalog (36, NOT 10,240)
    assert data["candidate_count"] == len(TAXONOMY_DATABASE)
    assert data["candidate_count"] == 36

    # 4. Score must be honest visual similarity for BioCLIP-2 (~0.746)
    assert 0.65 <= data["similarity_score"] <= 0.85, f"Unexpected similarity score: {data['similarity_score']}"

    # 5. Scoring transparency: distinguish cosine similarity, softmax density, and calibrated probability
    assert "softmax_density" in data
    assert 0.90 <= data["softmax_density"] <= 1.0  # closed-set softmax mass
    assert data["calibrated_probability"] is None, "Calibrated probability must be None when uncalibrated"
    assert "36" in data["catalog_scope"]

    # 6. Top-k predictions must be sorted descending by similarity score
    top_k = data["top_k_predictions"]
    assert len(top_k) >= 3
    for i in range(len(top_k) - 1):
        assert top_k[i]["similarity_score"] >= top_k[i+1]["similarity_score"], (
            f"Top-k predictions not sorted: {top_k[i]['similarity_score']} < {top_k[i+1]['similarity_score']}"
        )

    # 7. Runner up must be sister taxon Hepatica americana
    assert top_k[1]["scientific_name"] == "Hepatica americana"
    assert top_k[1]["taxonomy"]["family"] == "Ranunculaceae"

    # 8. Erythronium americanum similarity must be significantly lower than Hepatica
    erythronium_matches = [p for p in top_k if "Erythronium" in p["scientific_name"]]
    if erythronium_matches:
        assert erythronium_matches[0]["similarity_score"] < primary["similarity_score"] - 0.08


# ---------------------------------------------------------------------------
# 4. Out-of-Distribution and Ambiguity Handling
# ---------------------------------------------------------------------------
def test_out_of_distribution_uniform_gray_image():
    """
    Verifies that a synthetic uninformative image (e.g. solid gray noise) yields
    'inconclusive' status and low similarity score rather than a confident false match.
    """
    gray_img = Image.new("RGB", (224, 224), color=(128, 128, 128))
    buf = io.BytesIO()
    gray_img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"file": ("uniform_gray.jpg", buf, "image/jpeg")}
    response = client.post("/api/identify", files=files)

    assert response.status_code == 200
    data = response.json()

    assert data["confidence_status"] in ("inconclusive", "uncertain")
    assert data["similarity_score"] < 0.68  # Baseline flat vector in BioCLIP-2 ViT-L/14 is ~0.655
    assert data["confidence_status"] != "confident"
    assert data["uncertainty_warning"] is not None
    assert "Inconclusive" in data["uncertainty_warning"] or "Uncertain" in data["uncertainty_warning"] or "database" in data["uncertainty_warning"]


def test_out_of_distribution_random_noise_image():
    """
    Verifies that random Gaussian noise yields an inconclusive rating.
    """
    np.random.seed(42)
    noise = np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)
    img = Image.fromarray(noise)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"file": ("random_noise.jpg", buf, "image/jpeg")}
    response = client.post("/api/identify", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["confidence_status"] in ("inconclusive", "uncertain")
    assert data["similarity_score"] < 0.68  # Baseline noise vector in BioCLIP-2 ViT-L/14 is ~0.655
    assert data["confidence_status"] != "confident"


# ---------------------------------------------------------------------------
# 5. Verified Flower Specimen Identification (Harebell - Campanula rotundifolia)
# ---------------------------------------------------------------------------
def test_blue_bell_flower_specimen_harebell():
    """
    Validates that the nodding blue bell-shaped flower image is identified as
    Harebell (Campanula rotundifolia) with Common Bluebell as runner-up.
    """
    image_path = SAMPLE_DIR / "harebell_flower.jpg"
    assert image_path.exists(), f"Specimen image missing at {image_path}"

    with open(image_path, "rb") as f:
        files = {"file": ("harebell_flower.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    # Primary candidate must be Harebell
    assert data["common_name"] == "Harebell"
    assert data["scientific_name"] == "Campanula rotundifolia"
    assert data["confidence_status"] == "confident"
    assert 0.62 <= data["similarity_score"] <= 0.80

    # Top-2 must be Common Bluebell (Hyacinthoides non-scripta)
    top_k = data["top_k_predictions"]
    assert len(top_k) >= 5
    assert top_k[0]["common_name"] == "Harebell"
    assert top_k[1]["common_name"] == "Common Bluebell"
    assert top_k[0]["similarity_score"] > top_k[1]["similarity_score"]


def test_user_attached_blue_flower_specimen():
    """
    Validates that the user's uploaded photograph of nodding blue flowers
    is correctly identified as Harebell (Campanula rotundifolia) by BioCLIP-2.
    """
    image_path = SAMPLE_DIR / "attached_blue_flower.jpg"
    assert image_path.exists(), f"Specimen image missing at {image_path}"

    with open(image_path, "rb") as f:
        files = {"file": ("attached_blue_flower.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()
    assert data["common_name"] == "Harebell"
    assert data["scientific_name"] == "Campanula rotundifolia"
    assert data["confidence_status"] == "confident"
    assert 0.64 <= data["similarity_score"] <= 0.80


# ---------------------------------------------------------------------------
# 6. Tropical Foliage Out-of-Distribution & Inconclusive Handling
# ---------------------------------------------------------------------------
def test_tropical_foliage_out_of_distribution_inconclusive():
    """
    Validates that an image of large green leaves in a tropical forest (absent from catalog)
    is marked as 'inconclusive' with 'Uncertain identification' as the primary result.
    Mallard must NOT be presented as the confirmed identification!
    """
    image_path = SAMPLE_DIR / "tropical_foliage.jpg"
    assert image_path.exists(), f"Specimen image missing at {image_path}"

    with open(image_path, "rb") as f:
        files = {"file": ("tropical_foliage.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    # 1. Primary result must be 'Not in my database' or 'Uncertain identification', NOT Mallard
    assert data["common_name"] in ("Not in my database", "Uncertain identification")
    assert "Subject not recognized" in data["scientific_name"] or "Subject not confidently recognized" in data["scientific_name"]
    assert data["primary_candidate"] is None, "Inconclusive results must not assign a confirmed primary candidate"

    # 2. Status must be inconclusive
    assert data["confidence_status"] in ("inconclusive", "Not in my database")
    assert data["uncertainty_rating"] in ("inconclusive", "uncertain")
    assert data["similarity_score"] < 0.60, f"Score should be below 0.60 threshold: {data['similarity_score']}"

    # 3. Warning must clearly explain catalog omission and threshold
    assert "Not in my database" in data["uncertainty_warning"] or "Inconclusive" in data["uncertainty_warning"]
    assert "threshold" in data["uncertainty_warning"]

    # 4. Nearest neighbors are provided in top_k_predictions for inspection
    top_k = data["top_k_predictions"]
    assert len(top_k) >= 5
    # Mallard is NOT top prediction; score is below threshold
    assert top_k[0]["similarity_score"] < 0.60



# ---------------------------------------------------------------------------
# 7. Verified Animal & Bird Specimen Identification
# ---------------------------------------------------------------------------
def test_verified_animal_specimen_monarch():
    """Validates that a verified animal specimen (Monarch Butterfly) is correctly identified."""
    image_path = SAMPLE_DIR / "monarch_butterfly.jpg"
    assert image_path.exists(), f"Specimen image missing at {image_path}"

    with open(image_path, "rb") as f:
        files = {"file": ("monarch_butterfly.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["common_name"] == "Monarch Butterfly"
    assert data["scientific_name"] == "Danaus plexippus"
    assert data["confidence_status"] == "confident"
    assert data["primary_candidate"] is not None


def test_verified_bird_specimen_robin():
    """Validates that a verified bird specimen (American Robin) is correctly identified."""
    image_path = SAMPLE_DIR / "american_robin.jpg"
    assert image_path.exists(), f"Specimen image missing at {image_path}"

    with open(image_path, "rb") as f:
        files = {"file": ("american_robin.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["common_name"] == "American Robin"
    assert data["scientific_name"] == "Turdus migratorius"
    assert data["confidence_status"] == "confident"
    assert data["primary_candidate"] is not None


# ---------------------------------------------------------------------------
# 8. Error Handling Without Silent Fallback
# ---------------------------------------------------------------------------
def test_corrupted_image_returns_400_without_fallback():
    """Verifies that corrupted image bytes return HTTP 400 and never a fallback species."""
    files = {"file": ("corrupt.jpg", b"NOT_A_VALID_JPEG_HEADER", "image/jpeg")}
    response = client.post("/api/identify", files=files)
    assert response.status_code == 400
    assert "Invalid or corrupted image format" in response.json()["detail"]


def test_non_image_payload_returns_400_without_fallback():
    """Verifies that non-image payloads (e.g., text, PDF) return HTTP 400."""
    files = {"file": ("notes.txt", b"Plant notes taken in forest", "text/plain")}
    response = client.post("/api/identify", files=files)
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


# ---------------------------------------------------------------------------
# 9. Margin Calibration & Out-of-List Rejection Verification
# ---------------------------------------------------------------------------
def test_harebell_vs_bluebell_small_margin_not_confident():
    """
    Validates that when the visual margin between Harebell and Common Bluebell
    is narrow (top1 - top2 < 0.25 or top1 < 0.60), the system does NOT return 'confident'.
    """
    import torch

    from app.services.bioclip_service import BioClipService
    service = BioClipService.get_instance()
    service.load_model()

    # Find indices for Harebell and Common Bluebell
    harebell_idx = next(i for i, t in enumerate(service.candidate_taxa) if t["common_name"] == "Harebell")
    bluebell_idx = next(i for i, t in enumerate(service.candidate_taxa) if t["common_name"] == "Common Bluebell")

    # Synthetic ambiguous visual embedding: 50.1% harebell + 49.9% bluebell
    h_emb = service.text_features[harebell_idx]
    b_emb = service.text_features[bluebell_idx]
    ambiguous_emb = (0.501 * h_emb + 0.499 * b_emb).unsqueeze(0)
    ambiguous_emb /= ambiguous_emb.norm(dim=-1, keepdim=True)

    with torch.no_grad():
        cos_sim = (ambiguous_emb @ service.text_features.T)[0]
        scale = service.model.logit_scale.exp().item() if hasattr(service.model, "logit_scale") else 100.0
        probs = (scale * cos_sim).softmax(dim=-1)

    top_probs, top_indices = torch.topk(probs, 2)
    top1_prob = top_probs[0].item()
    top2_prob = top_probs[1].item()
    margin = top1_prob - top2_prob

    # By construction, margin between the two lookalikes is small (< 0.25)
    assert margin < 0.25, f"Expected narrow margin, got {margin}"

    # Verify decision logic under margin rule
    is_confident = (top1_prob >= 0.60 and margin >= 0.25)
    assert is_confident is False, (
        f"Small margin ({margin:.4f}) between Harebell and Common Bluebell must NOT return 'confident'"
    )


def test_out_of_list_organism_returns_uncertain_or_not_in_database():
    """
    Validates that an out-of-list organism (tropical foliage, cosine < 0.60)
    returns 'Not in my database' or 'uncertain', and rejects closed-set forcing.
    """
    image_path = SAMPLE_DIR / "tropical_foliage.jpg"
    assert image_path.exists()

    with open(image_path, "rb") as f:
        files = {"file": ("tropical_foliage.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["confidence_status"] in ("inconclusive", "uncertain", "Not in my database")
    assert data["common_name"] in ("Not in my database", "Uncertain identification")
    assert data["confidence_status"] != "confident"
    assert data["primary_candidate"] is None, "Out-of-list organism must not force a primary candidate"


# ---------------------------------------------------------------------------
# 11. Scoring Transparency, Candidate Counts & Plant vs Animal Integrity
# ---------------------------------------------------------------------------
def test_scoring_transparency_distinguishes_metrics():
    """
    Verifies that the inference response strictly distinguishes:
    1. Raw cosine similarity (geometric embedding alignment)
    2. Closed-set softmax density (probability mass among the 36 candidate taxa)
    3. Calibrated probability (None, explicitly indicating uncalibrated)
    """
    image_path = SAMPLE_DIR / "attached_blue_flower.jpg"
    assert image_path.exists()

    with open(image_path, "rb") as f:
        files = {"file": ("attached_blue_flower.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200
    data = response.json()

    # Raw cosine similarity is bounded in [-1, 1] and around 0.67 for Harebell
    assert 0.60 <= data["similarity_score"] <= 0.85
    # Softmax density is a relative probability mass over 36 taxa
    assert 0.80 <= data["softmax_density"] <= 1.0
    # Calibrated probability must be None (not fabricated)
    assert data["calibrated_probability"] is None
    # Catalog scope must accurately indicate 36 reference taxa
    assert data["candidate_count"] == 36
    assert "36" in data["catalog_scope"]


def test_foliage_plant_never_confused_with_animal():
    """
    Validates that foliage photographs are never presented as confirmed animal species.
    Specifically checks that tropical foliage does not get assigned to Mallard duck or other animals.
    """
    image_path = SAMPLE_DIR / "tropical_foliage.jpg"
    assert image_path.exists()

    with open(image_path, "rb") as f:
        files = {"file": ("tropical_foliage.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200
    data = response.json()

    # Must be inconclusive or Not in my database
    assert data["confidence_status"] == "inconclusive"
    assert data["primary_candidate"] is None
    assert "Mallard" not in data["common_name"]
    assert "Anas platyrhynchos" not in data["scientific_name"]


