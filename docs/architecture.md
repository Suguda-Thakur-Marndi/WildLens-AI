# Architecture & System Design

WildLens AI is an offline-first nature exploration and species identification platform designed for the Hacktoberfest 2026 Open-Source AI Challenge (Week 1: "Touch Grass").

The core architectural requirement is complete local independence: all vision inference, image preprocessing, taxonomic resolution, and observation persistence execute on the user's personal hardware without network dependencies or cloud APIs.

---

## 1. High-Level Architecture

```
[ User Browser / Client Device ]
│
├── Frontend (React 19, TypeScript, Vite, Tailwind CSS)
│   ├── UI Presentation Layer (Views, Layout, Cards, Modals)
│   ├── Custom React Hooks (useJournal, useMissions, useSystemTelemetry)
│   ├── Client Storage Engine (IndexedDB: 'WildLensAI_DB')
│   └── API Client Service (src/services/api.ts)
│
└── Backend Service (FastAPI, Python 3.12, Uvicorn)
    ├── REST API Router (/api/identify, /api/missions, /api/model/status, /api/health)
    ├── Request Validation & Preprocessing (Pillow verification, dimensions, memory guard)
    ├── Pydantic Schemas (strict contract serialization)
    ├── Domain Exception Handlers (400, 500, 503 HTTP status mappings)
    ├── Taxonomy Repository & Tree of Life Database (Curated biological taxa)
    └── BioCLIP-2 Inference Service (Singleton ViT-L/14 runtime, 768-dim candidate embeddings)
```

---

## 2. Component Separation & Responsibilities

### Frontend (`frontend/src/`)

- **`components/`**: Pure presentational and interaction components.
  - `layout/`: Global navigation header, mobile drawer, and offline status indicator.
  - `identification/`: File drag-and-drop, camera shutter, and taxonomic result cards.
  - `journal/`: Field observation history, filtering by verification state, and JSON export.
  - `missions/`: Mindful outdoor exploration challenges with step-by-step guidance.
  - `system/`: Real-time hardware telemetry and model runtime inspector.
- **`features/field-mode/`**: Specialized high-contrast sunlight view designed for outdoor mobile screens with minimal distraction and screen break reminders.
- **`hooks/`**: Encapsulates stateful workflows and keeps components clean:
  - `useJournal`: Coordinates IndexedDB CRUD operations and sorting.
  - `useMissions`: Manages mission state, completion tracking, and reflections.
  - `useSystemTelemetry`: Polls engine health, model status, and triggers warmup.
- **`services/`**: Low-level infrastructure clients:
  - `api.ts`: Fetch-based typed API client.
  - `journalStorage.ts`: Direct IndexedDB wrapper for observations.

### Backend (`backend/app/`)

- **`api/routes.py`**: Thin HTTP route handlers delegating to services. No business logic or model tensor handling inside route handlers.
- **`core/config.py`**: Centralized application settings using typed Pydantic fields (`host`, `port`, `model_identifier`, `vision_device`, `model_cache_dir`, `allowed_mime_types`).
- **`core/exceptions.py`**: Domain-specific error hierarchy (`ImageValidationError`, `ModelNotReadyError`, `InferenceExecutionError`) with explicit HTTP status handlers.
- **`utils/image_processing.py`**: Two-pass image validation pipeline. Pass 1 validates header integrity via `Image.verify()`; Pass 2 decodes pixel buffers, enforces RGB mode, checks dimension bounds, and applies Lanczos thumbnailing if dimensions exceed 3000px.
- **`services/bioclip_service.py`**: Thread-safe singleton managing the PyTorch OpenCLIP BioCLIP-2 model, tokenizer, and precomputed 768-dim taxonomy text embeddings.
- **`repositories/taxonomy_repository.py`**: Repository layer decoupling biological taxonomic queries from inference logic.

---

## 3. Data Flow: Identification Workflow

1. **Capture / Selection**: The user captures a photo via device camera or file selector.
2. **Client Validation**: The frontend checks MIME type (`image/jpeg`, `image/png`, `image/webp`) and size limits (< 15 MB) before dispatch.
3. **HTTP Multipart Dispatch**: The image is sent to `POST /api/identify` as `multipart/form-data`.
4. **Server Preprocessing**: The server decodes bytes with Pillow, verifies integrity, converts to RGB, and generates the input tensor using the model's native `preprocess_val` transform.
5. **Zero-Shot Similarity**: The image tensor passes through the BioCLIP-2 ViT-L/14 vision backbone. Normalized image features are multiplied by precomputed 768-dimensional text embeddings:
   $$\text{logits} = \exp(\text{logit\_scale}) \cdot (\mathbf{f}_{\text{image}} \cdot \mathbf{F}_{\text{text}}^T)$$
   Probabilities are derived via Softmax over the candidate distribution.
6. **Uncertainty & Lookalike Evaluation**: The top candidate is checked against calibrated confidence thresholds ($\ge 0.65$ similarity, $\ge 0.60$ softmax density, and margin $\ge 0.25$ for confident classification; specimens below 0.60 are rejected as "Not in my database"). Secondary matches are populated as lookalike candidates.
7. **Local Persistence**: The user reviews the field traits and saves the observation directly into browser IndexedDB. No observation data is ever sent to a remote cloud server.

---

## 4. Design Decisions & Trade-Offs

| Decision | Alternative Considered | Rationale |
|---|---|---|
| **Open-weight BioCLIP-2 (ViT-L/14)** | Large Generative VLM (e.g. Qwen2.5-VL 7B) | BioCLIP-2 provides grounded Tree of Life taxonomy trained on TreeOfLife-200M (200M images, MIT license). General VLMs frequently hallucinate binomial names and require 8-14 GB VRAM. |
| **Pre-computed 768-dim Text Embeddings** | Dynamic Per-Request Tokenization | Pre-computing dual-template lineage text embeddings for the curated taxa database reduces per-request latency and eliminates redundant forward passes on candidate taxonomy labels. |
| **Browser IndexedDB Storage** | SQLite / Local Server DB | Storing observations in client IndexedDB gives users 100% data custody. Observations persist even if the local Python server is restarted or moved. |
| **Vanilla CSS / Tailwind Utility** | Heavy Component Frameworks | Maintains high UI rendering performance and responsive responsiveness without framework bloat. |
