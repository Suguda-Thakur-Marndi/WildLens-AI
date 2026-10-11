"""
API Unit & Integration Tests for WildLens AI.
Tests endpoints for health, model status, validation, bad images, and error cases.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "WildLens AI"
    assert "Touch Grass" in data["challenge"]

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "model_status" in data
    assert "device" in data

def test_model_status_endpoint():
    response = client.get("/api/model/status")
    assert response.status_code == 200
    data = response.json()
    assert data["model_name"] == "imageomics/bioclip-2"
    assert data["model_license"] == "MIT"
    assert data["supported_taxa_count"] > 0
    assert data["offline_capable"] is True

def test_missions_endpoint():
    response = client.get("/api/missions")
    assert response.status_code == 200
    missions = response.json()
    assert isinstance(missions, list)
    assert len(missions) >= 5
    for m in missions:
        assert "id" in m
        assert "title" in m
        assert "short_objective" in m
        assert "safety_reminder" in m

def test_species_reference_endpoint():
    response = client.get("/api/species")
    assert response.status_code == 200
    species = response.json()
    assert isinstance(species, list)
    assert len(species) >= 10

def test_invalid_mime_type_rejected():
    files = {"file": ("test.txt", b"This is a text file", "text/plain")}
    response = client.post("/api/identify", files=files)
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]

def test_corrupt_image_rejected():
    files = {"file": ("corrupt.jpg", b"NOT_A_REAL_IMAGE_DATA_12345", "image/jpeg")}
    response = client.post("/api/identify", files=files)
    assert response.status_code == 400
    assert "Invalid or corrupted image format" in response.json()["detail"]

def test_empty_image_rejected():
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/identify", files=files)
    assert response.status_code == 400

def test_identify_get_endpoint_returns_instruction():
    response = client.get("/api/identify")
    assert response.status_code == 200
    data = response.json()
    assert data["method"] == "POST"
    assert data["content_type"] == "multipart/form-data"

def test_trailing_slashes_supported():
    res_health = client.get("/api/health/")
    assert res_health.status_code == 200
    res_model = client.get("/api/model/status/")
    assert res_model.status_code == 200
    res_missions = client.get("/api/missions/")
    assert res_missions.status_code == 200

def test_cors_preflight_options_for_github_pages():
    headers = {
        "Origin": "https://suguda-thakur-marndi.github.io",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }
    response = client.options("/api/identify", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://suguda-thakur-marndi.github.io"

