# Offline Acceptance Test & Verification Protocol

## Purpose
This document certifies the offline operation of **WildLens AI** in accordance with the Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass specifications.

---

## 1. Test Environment & Hardware Specification
- **Operating System:** Windows 11 Home (x64)
- **CPU:** 13th Gen Intel(R) Core(TM) i7-13700HX (16 Cores, 24 Logical Processors)
- **RAM:** 16 GB Physical Memory
- **Inference Runtime:** PyTorch 2.14.1 (CPU multi-threaded AVX2) + OpenCLIP
- **Model:** `imageomics/bioclip-2` (OpenCLIP ViT-L/14, TreeOfLife-200M, MIT License, 1.7 GB safetensors)
- **Local Cache Path:** `models/bioclip_cache/`

---

## 2. Acceptance Verification Procedure

### Step 1: Weight Pre-Caching
Ensure model weights have been cached to `models/bioclip_cache/`.

### Step 2: Isolation & Offline Simulation
The automated offline test `backend/tests/integration/test_offline_acceptance.py` enforces offline conditions programmatically:
1. Sets `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1` in the process environment.
2. Intercepts the Python `socket.create_connection` system call to strictly block any non-loopback IP address. Any attempt to reach an external host raises an explicit `[OFFLINE ACCEPTANCE VIOLATION]` error.

### Step 3: Test Execution
Run the acceptance test:
```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests/integration/test_offline_acceptance.py -v
```

### Step 4: Observed Results
```
backend/tests/integration/test_offline_acceptance.py::test_offline_loading_and_identification_acceptance PASSED [ 50%]
backend/tests/integration/test_offline_acceptance.py::test_embedding_cache_rejected_on_model_change PASSED [100%]
[OFFLINE ACCEPTANCE PASSED] Model identified 'Monarch Butterfly' in 2571.7ms with 0% external cloud egress.
```

---

## 3. Physical Network Disconnect Verification (Manual Field Check)
1. Turn off Wi-Fi or unplug Ethernet on the host machine.
2. Verify loopback is functional: `ping 127.0.0.1` -> replies 0ms.
3. Start backend: `uvicorn app.main:app --host 127.0.0.1 --port 8000`.
4. Start frontend preview: `npm run dev`.
5. Navigate to `http://localhost:5173`.
6. Upload `backend/sample_images/american_robin.jpg`.
7. Observe immediate identification of **American Robin (Turdus migratorius)** with confidence 1.000 and 0 network errors.

---

## 4. Certification Status
- **Offline Inference Status:** **PASS** (Directly verified with automated network boundary blocking).
- **External Network Dependency in Core ID:** **NONE**.

