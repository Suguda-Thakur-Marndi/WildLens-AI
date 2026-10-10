# Testing & Quality Assurance Guide

WildLens AI uses comprehensive automated testing across both backend Python services and frontend TypeScript components to ensure reliability, offline integrity, and data safety.

---

## 1. Test Architecture Overview

```
tests/
├── backend/tests/
│   ├── unit/
│   │   ├── test_image_processing.py      # Pillow decoding, dimensions, corrupt streams
│   │   ├── test_schemas.py               # Pydantic v2 aliases, serialization, defaults
│   │   └── test_taxonomy_repository.py   # Tree of Life lookups, prompt formatting
│   └── integration/
│       ├── test_api_endpoints.py         # HTTP contracts, error codes, MIME validation
│       ├── test_model_inference.py       # Real BioCLIP inference on actual photos
│       └── test_offline_acceptance.py    # Socket-level network interceptor audit
└── frontend/src/tests/
    └── components.test.tsx               # File validation, size limits, uncertainty logic
```

---

## 2. Backend Test Suites

### A. Unit Tests (`backend/tests/unit/`)
- **`test_image_processing.py`**:
  - `test_validate_and_decode_valid_image`: Ensures valid RGB, RGBA, and palette images decode properly.
  - `test_validate_empty_image_raises_error`: Validates that empty 0-byte uploads raise `ImageValidationError` with HTTP 400.
  - `test_validate_corrupt_data_raises_error`: Feeds random binary garbage and verifies graceful rejection without server crashes.
  - `test_validate_oversized_payload_raises_error`: Enforces max file size limits (15 MB default).
  - `test_validate_degenerate_dimensions_raises_error`: Blocks 1x1 pixel tracking beacons or degenerate images.
- **`test_schemas.py`**:
  - Validates `TaxonomicHierarchy` alias handling (e.g. `class` vs `class_name`).
  - Confirms JSON serialization of `CandidateSpecies` and `IdentificationResponse`.
- **`test_taxonomy_repository.py`**:
  - Checks ID-based and name-based O(1) index queries across curated taxa.
  - Verifies biological prompt construction for OpenCLIP text encodings.

### B. Integration Tests (`backend/tests/integration/`)
- **`test_api_endpoints.py`**:
  - `GET /`: Verifies root welcome payload and challenge metadata.
  - `GET /api/health`: Confirms operational health and system RAM telemetry.
  - `GET /api/model/status`: Verifies model identifier, revision, and cache path.
  - `GET /api/missions`: Confirms delivery of mindful Touch Grass exploration missions.
  - `GET /api/species`: Verifies the biological species reference catalog.
  - `POST /api/identify` error cases: Rejection of `text/plain`, corrupt files, and empty bodies.
- **`test_model_inference.py`**:
  - `test_real_inference_monarch_butterfly`: Executes full PyTorch forward pass on `monarch_butterfly.jpg` and verifies top-1 match *Danaus plexippus*.
  - `test_real_inference_white_oak_leaf`: Tests botany classification on `white_oak_leaf.jpg`.
  - `test_real_inference_american_robin`: Tests ornithology classification on `american_robin.jpg`.
- **`test_offline_acceptance.py`**:
  - **Socket-Level Network Interceptor Protocol**:
    Monitors all socket calls via `socket.create_connection`. Any attempt to connect to a non-loopback host (e.g., Hugging Face Hub, external cloud APIs) immediately raises a `ConnectionRefusedError`.
    Verifies that the entire inference pipeline executes locally with zero external network egress.

---

## 3. Running Tests Locally

### Backend Tests
```bash
# Activate virtual environment
.\.venv\Scripts\activate   # Windows
# source .venv/bin/activate # Linux/macOS

# Run complete pytest test suite (22 tests)
pytest backend/tests/ -v

# Run only unit tests (sub-second execution)
pytest backend/tests/unit/ -v

# Run Ruff linter
ruff check backend/
```

### Frontend Tests
```bash
cd frontend

# Run Vitest test runner
npm run test

# Run TypeScript typechecker and production bundle build
npm run build
```

### Standalone Offline Verification Script
```bash
python scripts/verify_offline.py
```

### Automated Hardware Profiler
```bash
python scripts/benchmark_hardware.py
```

---

## 4. Continuous Integration (CI)

Every commit and pull request triggers `.github/workflows/ci.yml`:
1. **Python 3.12 Job**: Installs dependencies, runs Ruff linting, and executes the complete unit test suite.
2. **Node.js 20 Job**: Runs `npm ci`, checks TypeScript types with `tsc -b`, executes Vitest, and compiles the production Vite bundle.
