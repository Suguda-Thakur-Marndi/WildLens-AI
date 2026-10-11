"""
Unit tests for WildLens AI API configuration, secret masking, and credential lifecycle.
Verifies:
1. Strong validation on configuration variables (port, OOD threshold, timeout).
2. Sanitization: repr, str, and safe_summary never reveal secret keys.
3. Handling of missing, invalid, revoked, expired, rate-limited, and unavailable credentials.
4. Independent operation: Gemini failure does not disable local BioCLIP-2 inference.
"""

import asyncio
from unittest import mock

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from app.services.gemini_service import GeminiService


def test_settings_validation_rules():
    """Validates that boundary conditions are strictly enforced on configuration."""
    valid_cfg = Settings(port=8080, out_of_distribution_threshold=0.5, gemini_timeout_seconds=10.0)
    assert valid_cfg.port == 8080
    assert valid_cfg.out_of_distribution_threshold == 0.5

    # Invalid port
    with pytest.raises(ValueError, match="Port must be between 1 and 65535"):
        Settings(port=99999)

    # Invalid OOD threshold
    with pytest.raises(ValueError, match="out_of_distribution_threshold must be between 0.0 and 1.0"):
        Settings(out_of_distribution_threshold=1.5)

    # Invalid timeout
    with pytest.raises(ValueError, match="gemini_timeout_seconds must be positive"):
        Settings(gemini_timeout_seconds=-5.0)


def test_secret_str_masking_and_sanitization():
    """Verifies that secrets are never exposed in string representations, logs, or summaries."""
    secret_value = "AIzaSyFakeSecretKeyForTestingPurposeOnly12345"
    s = Settings(gemini_api_key=SecretStr(secret_value))

    # Masking test
    masked = s.get_masked_gemini_key()
    assert secret_value not in masked
    assert masked.startswith("AIza")
    assert masked.endswith("chars)")

    # safe_summary must not leak secret
    summary = s.safe_summary()
    assert secret_value not in str(summary)
    assert summary["gemini_configured"] is True
    assert summary["gemini_key_status"] == masked

    # repr and str must not expose raw secret
    repr_str = repr(s)
    assert secret_value not in repr_str
    assert str(s) == repr_str


def test_unconfigured_settings_masking():
    s = Settings(gemini_api_key=None)
    assert s.is_gemini_configured() is False
    assert s.get_gemini_api_key() == ""
    assert s.get_masked_gemini_key() == "[UNCONFIGURED]"


def test_gemini_service_when_credentials_missing(monkeypatch):
    """Missing API credentials must gracefully report status without silent fake answers."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", None)
    service = GeminiService()

    status = asyncio.run(service.get_status())
    assert status.configured is False
    assert status.status == "unconfigured"
    assert "not configured" in status.message.lower()

    # Must raise 503 rather than silently fabricating responses
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(service.explain_species(species_name="Monarch Butterfly"))
    assert exc_info.value.status_code == 503
    assert "not configured" in exc_info.value.detail.lower()

    with pytest.raises(HTTPException) as exc_info_ask:
        asyncio.run(service.ask_naturalist(question="Where do monarch butterflies migrate?"))
    assert exc_info_ask.value.status_code == 503


def test_gemini_service_when_credentials_invalid_or_revoked(monkeypatch):
    """Invalid or revoked credentials must raise 502 with clear diagnostic without leaking key."""
    from app.core.config import settings

    test_key = "AIzaSyInvalidKeyTest1234567890abcdef"
    monkeypatch.setattr(settings, "gemini_api_key", SecretStr(test_key))
    service = GeminiService()

    # Mock response returning 400 API_KEY_INVALID
    mock_resp = mock.MagicMock()
    mock_resp.status_code = 400
    mock_resp.text = '{"error": {"code": 400, "message": "API_KEY_INVALID", "status": "INVALID_ARGUMENT"}}'

    with mock.patch("httpx.AsyncClient.get", return_value=mock_resp):
        status = asyncio.run(service.get_status())
        assert status.status == "invalid_key"
        assert status.configured is False
        assert "invalid, revoked, or expired" in status.message.lower()

    with mock.patch("httpx.AsyncClient.post", return_value=mock_resp):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(service.explain_species(species_name="Monarch Butterfly"))
        assert exc_info.value.status_code == 502
        assert "authentication failed" in exc_info.value.detail.lower()
        # Verify the raw key is NEVER present in the exception detail
        assert test_key not in exc_info.value.detail


def test_gemini_service_when_rate_limited(monkeypatch):
    """Rate-limited credentials must raise 429."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", SecretStr("AIzaSyRateLimitKey1234567890"))
    service = GeminiService()

    mock_resp = mock.MagicMock()
    mock_resp.status_code = 429
    mock_resp.text = '{"error": {"code": 429, "message": "RESOURCE_EXHAUSTED"}}'

    with mock.patch("httpx.AsyncClient.get", return_value=mock_resp):
        status = asyncio.run(service.get_status())
        assert status.status == "rate_limited"
        assert "rate limit reached" in status.message.lower()

    with mock.patch("httpx.AsyncClient.post", return_value=mock_resp):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(service.explain_species(species_name="Monarch Butterfly"))
        assert exc_info.value.status_code == 429
        assert "rate limit" in exc_info.value.detail.lower()


def test_gemini_service_when_upstream_times_out(monkeypatch):
    """Network timeouts must raise 504 Gateway Timeout."""
    import httpx

    from app.core.config import settings

    monkeypatch.setattr(settings, "gemini_api_key", SecretStr("AIzaSyTimeoutKey1234567890"))
    service = GeminiService()

    with mock.patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Read timed out")):
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(service.explain_species(species_name="Monarch Butterfly"))
        assert exc_info.value.status_code == 504
        assert "timed out" in exc_info.value.detail.lower()


def test_independent_operation_when_gemini_fails():
    """
    Verifies Requirement 7:
    Gemini failure or missing key must NOT disable or impair local BioCLIP-2 health/inference.
    """
    from fastapi.testclient import TestClient

    from app.core.config import settings
    from app.main import app

    client = TestClient(app)

    # Simulate Gemini unconfigured
    with mock.patch.object(settings, "gemini_api_key", None):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["gemini_status"] == "unconfigured"
        assert data["gemini_configured"] is False
        # Local BioCLIP-2 remains operational
        assert data["model_status"] in ("ready", "unloaded", "loading", "uninitialized")

    # Simulate Gemini service throwing unexpected exception
    with mock.patch.object(GeminiService, "is_configured", new_callable=mock.PropertyMock, side_effect=RuntimeError("Provider crash")):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["gemini_configured"] is False
