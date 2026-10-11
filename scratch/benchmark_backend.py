import time
import os
import psutil
import statistics
import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.services.bioclip_service import BioClipService

def get_process_memory_mb():
    process = psutil.Process(os.getpid())
    return round(process.memory_info().rss / (1024 * 1024), 2)

def run_benchmark():
    print("=== BACKEND BENCHMARK START ===")
    mem_initial = get_process_memory_mb()
    print(f"Initial Process Memory: {mem_initial} MB")

    client = TestClient(app)

    # 1. Measure lightweight API responses
    t0 = time.perf_counter()
    res_health = client.get("/api/health")
    health_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    assert res_health.status_code == 200

    t0 = time.perf_counter()
    res_status = client.get("/api/model/status")
    status_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    assert res_status.status_code == 200

    t0 = time.perf_counter()
    res_missions = client.get("/api/missions")
    missions_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    assert res_missions.status_code == 200

    t0 = time.perf_counter()
    res_species = client.get("/api/species")
    species_latency_ms = round((time.perf_counter() - t0) * 1000, 2)
    assert res_species.status_code == 200

    print(f"API Latencies:")
    print(f"  /api/health: {health_latency_ms} ms")
    print(f"  /api/model/status: {status_latency_ms} ms")
    print(f"  /api/missions: {missions_latency_ms} ms")
    print(f"  /api/species: {species_latency_ms} ms")

    # 2. Measure Model Initialization Time
    t_load_start = time.perf_counter()
    service = BioClipService.get_instance()
    success = service.load_model()
    load_time_sec = round(time.perf_counter() - t_load_start, 3)
    mem_after_load = get_process_memory_mb()
    mem_delta_mb = round(mem_after_load - mem_initial, 2)

    print(f"Model Initialization:")
    print(f"  Success: {success}")
    print(f"  Load Time: {load_time_sec} s")
    print(f"  Device: {service.device} ({service.precision})")
    print(f"  Memory After Load: {mem_after_load} MB (+{mem_delta_mb} MB)")

    # 3. Measure First Inference Latency vs Subsequent
    sample_img_path = Path(__file__).parent.parent / "frontend/public/sample_images/monarch_butterfly.jpg"
    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()

    print(f"Sample Image Size: {len(img_bytes)} bytes ({round(len(img_bytes)/(1024*1024), 2)} MB)")

    # First inference (cold inference)
    t_inf_1 = time.perf_counter()
    resp_1 = client.post("/api/identify", files={"file": ("test.jpg", img_bytes, "image/jpeg")})
    first_inf_latency_ms = round((time.perf_counter() - t_inf_1) * 1000, 2)
    assert resp_1.status_code == 200, f"Inference 1 failed: {resp_1.text}"
    data_1 = resp_1.json()

    # Subsequent inferences (warm inference)
    warm_latencies = []
    for i in range(5):
        t_inf = time.perf_counter()
        resp = client.post("/api/identify", files={"file": ("test.jpg", img_bytes, "image/jpeg")})
        assert resp.status_code == 200
        warm_latencies.append((time.perf_counter() - t_inf) * 1000)

    avg_warm_ms = round(statistics.mean(warm_latencies), 2)
    min_warm_ms = round(min(warm_latencies), 2)
    max_warm_ms = round(max(warm_latencies), 2)
    mem_after_inferences = get_process_memory_mb()

    print(f"Inference Latencies:")
    print(f"  First (cold) inference: {first_inf_latency_ms} ms")
    print(f"  Subsequent (warm) avg: {avg_warm_ms} ms (min: {min_warm_ms} ms, max: {max_warm_ms} ms)")
    print(f"  Identified Top Species: {data_1.get('common_name')} ({data_1.get('scientific_name')})")
    print(f"  Similarity: {data_1.get('similarity_score')}, Confidence: {data_1.get('confidence_status')}")
    print(f"  Final Memory: {mem_after_inferences} MB")
    print("=== BACKEND BENCHMARK END ===")

if __name__ == "__main__":
    run_benchmark()
