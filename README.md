# WildLens AI 🌿
**Autonomous Naturalist Instrument & Touch Grass Field Guide**

> An offline-first nature exploration instrument powered by open-weight AI, built to help people observe the natural world directly rather than keeping them tethered to their screens.

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![AI Model: BioCLIP-2](https://img.shields.io/badge/Vision%20Model-imageomics%2Fbioclip--2-blue.svg)](https://huggingface.co/imageomics/bioclip-2)
[![Offline Verified](https://img.shields.io/badge/Offline-Socket%20Audited-brightgreen.svg)](docs/OFFLINE_VERIFICATION.md)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%2B%20Python-teal.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016%20%2B%20React%2019-black.svg)](https://nextjs.org)

---

## 1. Project Mission & Philosophy

Modern wildlife apps often duplicate the engagement traps of consumer social media: gamified streaks, notification pings, endless scrolling feeds, and remote cloud surveillance.

**WildLens AI** takes the opposite approach:
1. **Screen Minimization (Touch Grass Flow):** The screen should be the shortest part of your outdoor experience. Camera &rarr; one glance at the species name, confidence band, and key trait &rarr; a **"Now Look Up"** screen with a sensory prompt that dims the screen to near-black for 60 seconds while you look at the canopy, sky, or soil.
2. **Single Open Model:** Driven entirely by `imageomics/bioclip-2` (ViT-L/14, trained on TreeOfLife-200M). No opaque cloud APIs, no multi-gigabyte language model layers, and zero cloud egress.
3. **Curated, Honest Knowledge:** Distinguishing traits come strictly from a curated natural history database (`taxonomy_kb.py`). If a species lacks a curated entry, the app displays an honest observation checklist rather than fabricating facts.
4. **Mandatory Safety First:** Every fungi identification unconditionally presents a mandatory safety warning: *Never eat wild mushrooms based on this app.*

---

## 2. The Open Advantage

WildLens AI is grounded in open science and digital privacy:
- **One Open Model**: A single foundation vision model (`imageomics/bioclip-2`, MIT license) rather than chained opaque LLMs.
- **Local & Air-Gapped**: Runs entirely on your laptop or local hardware. Works miles away from cell towers.
- **Zero Cost & No Accounts**: No sign-in, no API keys, no subscription tiers, and no telemetry tracking.
- **Data Privacy**: Photos and observation journals never leave your machine.
- **Swappable Architecture**: Configurable via `VISION_MODEL_ID` (default: `imageomics/bioclip-2`). Swapping models automatically detects embedding dimension changes and safely rebuilds the candidate cache.

---

## 3. Touch Grass Field Mode Flow

Field Mode is the default landing screen (`/`):
- **Camera Viewfinder**: Fast, glove-friendly live camera viewfinder with high-contrast outdoor controls.
- **One-Glance Result**:
  - Species common and scientific name.
  - Confidence band: **Likely** (emerald), **Possible** (amber), or **Unsure** (gray).
  - One-line curated diagnostic trait from `taxonomy_kb.py`.
  - Mandatory red mushroom warning banner on all fungi.
- **"Now Look Up" Screen Break**:
  - Tapping *"Now Look Up"* dims the screen to near-black (`#050805`) to conserve battery.
  - Presents one sensory prompt (e.g., listening for distinct bird calls or feeling wind direction).
  - A gentle 60-second timer runs; tapping anywhere or timer expiration returns directly to the camera.
- **Secondary Features**: Field Journal, Field Missions, and Detailed Optical Loupe are organized into a clean drawer menu so the main screen stays uncluttered.

---

## 4. Hardware Benchmarks & Performance

Measured directly on an Intel Core i7-13700HX (16 physical cores, 24 threads, 16 GB DDR5 RAM, NVIDIA RTX 5060 Laptop GPU) on Windows 11 using `scripts/benchmark_hardware.py`:

| Specimen Test Photo | Clade / Category | Identified Species | Cosine Sim | Softmax Conf | Latency (CPU) | Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `american_robin.jpg` | Aves | American Robin (*Turdus migratorius*) | 0.722 | 100.0% | **2,502.6 ms** | PASS |
| `blue_jay.jpg` | Aves | Blue Jay (*Cyanocitta cristata*) | 0.726 | 100.0% | **2,537.6 ms** | PASS |
| `white_oak_leaf.jpg` | Plantae | White Oak (*Quercus alba*) | 0.729 | 100.0% | **2,525.2 ms** | PASS |
| `northern_red_oak_leaf.jpg` | Plantae (Lookalike) | Northern Red Oak (*Quercus rubra*) | 0.693 | 61.0% | **2,559.4 ms** | PASS |
| `monarch_butterfly.jpg` | Insecta | Monarch Butterfly (*Danaus plexippus*) | 0.703 | 99.8% | **2,600.0 ms** | PASS |
| `viceroy_butterfly.jpg` | Insecta (Lookalike) | Viceroy Butterfly (*Limenitis archippus*) | 0.732 | 100.0% | **2,576.3 ms** | PASS |
| `fly_agaric_mushroom.jpg` | Fungi | Fly Agaric (*Amanita muscaria*) | 0.722 | 100.0% | **2,571.0 ms** | PASS |
| `golden_chanterelle.jpg` | Fungi | Golden Chanterelle (*Cantharellus cibarius*) | 0.730 | 100.0% | **2,579.2 ms** | PASS |
| `tropical_foliage.jpg` | Out-of-Distribution | Bloodroot (*Tentative NN*, 0.549 < 0.60) | 0.549 | 21.4% | **2,575.6 ms** | PASS (Rejected) |
| `blurry_woodland_shadow.jpg` | Ambiguous | Painted Turtle (*Ambiguous NN*, 0.676) | 0.676 | 29.4% | **2,557.2 ms** | PASS (Uncertain) |

### Key Hardware Metrics:
- **In-Distribution Top-1 Accuracy:** **100.0% (19 / 19)** on evaluated catalog specimens
- **In-Distribution Top-3 Accuracy:** **100.0% (19 / 19)**
- **Mean Warm Inference Latency (CPU):** **2,559.9 ms** (~2.56 seconds per image on 16 threads)
- **Projected GPU Latency (CUDA fp16):** **~50 - 90 ms**
- **Model Weight RAM Footprint:** **1,822.9 MB RAM**
- **Peak Process Resident RAM:** **2,044.9 MB RAM** (standalone vision engine, no LLM)
- **Cold-Start Deserialization:** **38.34 s**

---

## 5. System Architecture

```mermaid
flowchart TD
    A[Outdoor Camera / Field Photo] -->|Capture In Situ| B[Touch Grass Field Mode Landing]
    B -->|Offline Client Validation| C[FastAPI Local Server: WILDLENS_HOST:8000]
    C -->|Pillow 2-Pass Verification| D[BioClipService Singleton]
    D -->|Native preprocess_val Transform| E[imageomics/bioclip-2 ViT-L/14]
    E -->|768-dim Normalized Image Embedding| F[Cosine Alignment with Taxa Embeddings]
    F -->|Curated Traits & Fungi Guard| G[Structured IdentificationResponse]
    G --> H[One-Glance Result View]
    H -->|Tap Now Look Up| I[Sensory Screen Break: 60s Dimming to Near-Black]
    I -->|Tap Anywhere or Timer End| B
```

---

## 6. Outdoor Mobile Hotspot / LAN Usage

You can run the backend on a laptop in your backpack and use your smartphone's camera in the field without any internet connection:

1. Connect both laptop and phone to the same portable Wi-Fi hotspot (no cellular internet uplink required).
2. Configure the backend host in `.env`:
   ```bash
   WILDLENS_HOST=0.0.0.0
   PORT=8000
   ```
3. Start the backend:
   ```bash
   python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
   ```
4. Start the frontend:
   ```bash
   cd frontend
   npm run dev -- --host 0.0.0.0
   ```
5. On your phone's browser, open `http://<laptop-lan-ip>:3000`.

> [!WARNING]
> Setting `WILDLENS_HOST=0.0.0.0` binds the server to all network interfaces, making it accessible to any device on the local network. Only use this on trusted personal hotspots or private LANs, never on untrusted public Wi-Fi.

---

## 7. Field Test Log

*Use this table to record actual outdoor observations during field outings:*

| Date | Location | Weather & Light | Observed Subject | Model Prediction | Confidence Band | Field Verification Notes |
|---|---|---|---|---|---|---|
| *YYYY-MM-DD* | *Hemlock Trail* | *Overcast, dappled light* | *Quercus alba* | *White Oak* | *Likely* | *Observed rounded lobes without bristle tips.* |
| *YYYY-MM-DD* | *Meadow Border* | *Direct sunlight* | *Danaus plexippus* | *Monarch Butterfly* | *Likely* | *Confirmed lack of post-median hindwing line.* |
| *YYYY-MM-DD* | *[Location]* | *[Conditions]* | *[Specimen]* | *[Prediction]* | *[Band]* | *[Physical field traits observed]* |
| *YYYY-MM-DD* | *[Location]* | *[Conditions]* | *[Specimen]* | *[Prediction]* | *[Band]* | *[Physical field traits observed]* |

---

## 8. Quickstart & Installation

### 1. Setup Python Virtual Environment
```bash
python -m venv .venv

# On Windows:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r backend/requirements.txt
```

### 2. Configure Environment Variables
Copy the secure environment template:
```bash
cp .env.example .env
```
Key configuration variables (see [.env.example](.env.example) and [API Integration Audit](docs/API_INTEGRATION_AUDIT.md)):
- `PORT=8000`: FastAPI backend listening port.
- `WILDLENS_HOST=127.0.0.1`: Network interface binding (`0.0.0.0` for LAN/hotspot).
- `CORS_ORIGINS`: Comma-separated list of permitted frontend origins.
- `GEMINI_API_KEY`: *(Optional)* Google AI Studio key for server-side natural history synthesis and nature Q&A. Leave blank for 100% offline BioCLIP-2 vision inference.
- `NEXT_PUBLIC_API_URL`: Public backend endpoint for frontend builds (`http://localhost:8000`).

> [!SECURITY]
> Never commit real `.env` files or API keys. Real `.env` files are ignored by Git. In production hosting (Render, Railway, Fly.io, Cloud Run), configure `GEMINI_API_KEY` through the hosting provider's Environment Variables dashboard.

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Start Backend & Frontend
```bash
# Terminal 1: Backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 9. Verification & Test Suites

### Run Backend Unit & Integration Tests
```bash
# Run unit tests (validation, secret masking, credential lifecycle, safety guards)
.\.venv\Scripts\python.exe -m pytest backend/tests/unit -v

# Run API endpoint integration tests
.\.venv\Scripts\python.exe -m pytest backend/tests/integration/test_api_endpoints.py -v
```

### Run Code Quality & Linting
```bash
# Backend lint check (Ruff)
.\.venv\Scripts\ruff.exe check backend/

# Frontend lint check (Oxlint)
cd frontend && npm run lint && cd ..
```

### Run Frontend Tests (43 Tests)
```bash
cd frontend
npm test
npm run build
```
Validates API client resilience, error handling (429, 502, 503, 504), IndexedDB sync, camera stream permissions, and static build generation.

### Run Hardware Benchmark
```bash
.\.venv\Scripts\python.exe scripts/benchmark_hardware.py
```
Executes real timing and memory profiling across 21 biodiversity test images.

### Security & API Audit
For the complete production security audit, git history scan results, and hosting configuration guide, consult [docs/API_INTEGRATION_AUDIT.md](docs/API_INTEGRATION_AUDIT.md).

---

## 10. Known Limitations & Safety

1. **Microscopic Traits**: BioCLIP-2 identifies organisms from field macro-photography. It cannot resolve microscopic fungal spores or cellular features.
2. **Juveniles and Dormancy**: Winter twigs and early instar larvae may score lower similarity than mature specimens.
3. **Mandatory Fungi Notice**: Never eat wild mushrooms or plants based on computer vision identification.
