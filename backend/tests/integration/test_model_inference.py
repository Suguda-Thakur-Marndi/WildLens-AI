"""
Real Model Inference Tests for WildLens AI.
Directly tests BioCLIP inference using authentic biological photographs.
"""

from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent / "sample_images"

def test_real_inference_monarch_butterfly():
    image_path = SAMPLE_DIR / "monarch_butterfly.jpg"
    assert image_path.exists(), f"Sample image missing at {image_path}"

    with open(image_path, "rb") as f:
        files = {"file": ("monarch_butterfly.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["primary_candidate"] is not None
    assert data["primary_candidate"]["common_name"] == "Monarch Butterfly"
    assert data["primary_candidate"]["scientific_name"] == "Danaus plexippus"
    assert data["primary_candidate"]["confidence"] > 0.50
    assert data["uncertainty_rating"] == "confident"
    assert len(data["suggested_outdoor_inspection"]) > 0
    assert "safety_and_ethics_reminder" in data
    assert data["offline_verified"] is True
    assert data["inference_time_ms"] > 0

def test_real_inference_white_oak_leaf():
    image_path = SAMPLE_DIR / "white_oak_leaf.jpg"
    assert image_path.exists(), f"Sample image missing at {image_path}"

    with open(image_path, "rb") as f:
        files = {"file": ("white_oak_leaf.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["primary_candidate"] is not None
    assert data["primary_candidate"]["common_name"] == "White Oak"
    assert data["primary_candidate"]["scientific_name"] == "Quercus alba"
    assert data["primary_candidate"]["confidence"] > 0.50
    assert data["uncertainty_rating"] == "confident"

def test_real_inference_american_robin():
    image_path = SAMPLE_DIR / "american_robin.jpg"
    assert image_path.exists(), f"Sample image missing at {image_path}"

    with open(image_path, "rb") as f:
        files = {"file": ("american_robin.jpg", f, "image/jpeg")}
        response = client.post("/api/identify", files=files)

    assert response.status_code == 200, f"Error: {response.text}"
    data = response.json()

    assert data["primary_candidate"] is not None
    assert data["primary_candidate"]["common_name"] == "American Robin"
    assert data["primary_candidate"]["scientific_name"] == "Turdus migratorius"
    assert data["primary_candidate"]["confidence"] > 0.50
