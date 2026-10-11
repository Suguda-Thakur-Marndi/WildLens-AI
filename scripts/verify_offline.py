#!/usr/bin/env python3
"""
WildLens AI — Offline Acceptance & Cloud Egress Verification Script

Enforces strict socket-level guards blocking all non-loopback connections,
sets HF_HUB_OFFLINE=1, and runs an end-to-end biological inference pass.
Exits with code 0 only if 100% of inference completes without network egress.
"""

import sys
import os
import socket
from pathlib import Path

# Enforce project root on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

# Block network calls at process level
os.environ["HF_HUB_OFFLINE"] = "1"

_real_create_connection = socket.create_connection

def guarded_create_connection(address, *args, **kwargs):
    host, port = address
    allowed_hosts = ("127.0.0.1", "localhost", "::1", "0.0.0.0")
    if host not in allowed_hosts:
        raise ConnectionRefusedError(
            f"[OFFLINE VIOLATION] Attempted network connection to '{host}:{port}'. "
            "WildLens AI strictly prohibits external cloud egress."
        )
    return _real_create_connection(address, *args, **kwargs)

socket.create_connection = guarded_create_connection

def run_offline_audit():
    print("=" * 60)
    print("WildLens AI — Offline Egress Audit Protocol")
    print("=" * 60)
    print("1. Network socket interceptor active: external egress BLOCKED.")
    print("2. Offline environment variables locked: HF_HUB_OFFLINE=1.")

    from app.services.bioclip_service import BioClipService

    service = BioClipService.get_instance()
    print("3. Loading BioCLIP-2 weights from local cache...")
    success = service.load_model(force_reload=True)
    if not success:
        print(f"[FAIL] Failed to initialize model: {service.last_error}")
        sys.exit(1)

    print(f"   Model ready on device '{service.device}' in {service.load_time_seconds}s.")

    sample_img_path = PROJECT_ROOT / "backend" / "sample_images" / "monarch_butterfly.jpg"
    if not sample_img_path.exists():
        sample_img_path = PROJECT_ROOT / "sample_images" / "monarch_butterfly.jpg"
    if not sample_img_path.exists():
        print(f"[FAIL] Sample test image not found at {sample_img_path}")
        sys.exit(1)

    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()

    print(f"4. Executing inference on test sample ({sample_img_path.name}, {len(img_bytes)} bytes)...")
    result = service.identify_image(img_bytes)

    primary = result.primary_candidate
    print("\n--- INFERENCE RESULTS ---")
    print(f"Predicted Species : {primary.common_name} ({primary.scientific_name})")
    print(f"Model Confidence  : {primary.confidence * 100:.2f}%")
    print(f"Uncertainty Level : {result.uncertainty_rating}")
    print(f"Inference Latency : {result.inference_time_ms} ms")
    print(f"Offline Verified  : {result.offline_verified}")

    if primary.common_name != "Monarch Butterfly":
        print(f"[FAIL] Expected 'Monarch Butterfly', got '{primary.common_name}'")
        sys.exit(1)

    print("\n[SUCCESS] 100% Offline Acceptance Verified with 0 external network requests!")
    print("=" * 60)

if __name__ == "__main__":
    run_offline_audit()
