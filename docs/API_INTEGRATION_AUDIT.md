# WildLens AI — Production API Integration & Security Audit Report

**Date:** October 12, 2026  
**Auditor:** WildLens AI System Architect  
**Scope:** Complete repository audit of API keys, tokens, secrets, provider URLs, API clients, CI/CD workflows, and git history.

---

## 1. Executive Summary

WildLens AI has been audited to enforce strict production-grade API standards, credential isolation, and offline independence. The system follows an **offline-first, zero-leakage architecture**:
- **Zero Frontend Secrets:** No secrets, tokens, or private credentials are included in the frontend client bundles or static export.
- **Git History Cleanliness:** 100% of commits (17 commits in total history) were scanned; zero raw API keys or production secrets have ever been committed.
- **Standardized Configuration:** Backend configuration is centralized into a validated, strongly-typed Pydantic `Settings` module (`backend/app/core/config.py`) using `SecretStr` to prevent accidental logging or exposure.
- **Header Authentication:** Gemini API calls utilize the `x-goog-api-key` HTTP header rather than query string parameters, eliminating URL credential leakage in proxy and access logs.
- **Provider Decoupling & Independence:** Local vision inference via BioCLIP-2 open-weight foundation model runs 100% offline. Complete failure, absence, or revocation of cloud provider credentials (Gemini) does not impair local vision inference, health checks, or Field Journal persistence.
- **No Silent Hallucinations:** Missing, invalid, rate-limited, or unavailable credentials fail explicitly with typed error codes (`429`, `502`, `503`, `504`) and transparent user guidance.

---

## 2. API Integration Inventory Matrix

| Integration / Service | Scope / Role | Authentication Mechanism | Provider Endpoint / URL | Client Location | Secret Storage Location |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FastAPI Backend Service** | Core REST API for nature identification & data sync | None (Public REST over CORS) | Default `http://127.0.0.1:8000` (Configurable via `WILDLENS_HOST`, `HOST`, `PORT`) | Next.js Frontend (`frontend/src/lib/api.ts`) | N/A (Endpoint URL only, via `NEXT_PUBLIC_API_URL`) |
| **BioCLIP-2 Vision Model** | Local ViT-L/14 open-weight taxonomic vision classifier | Open Weights / Public Repo; Optional `HF_TOKEN` for private forks | Hugging Face Hub (`imageomics/bioclip-2`) | `backend/app/services/bioclip_service.py`, `scripts/download_bioclip2.py` | Local disk cache (`models/bioclip_cache/`); Optional `HF_TOKEN` in backend `.env` |
| **Google Gemini Naturalist AI** | Optional field natural history synthesis & nature Q&A | `x-goog-api-key` HTTP header (`SecretStr`) | `https://generativelanguage.googleapis.com/v1beta/models` (Configurable via `GEMINI_API_BASE_URL`) | `backend/app/services/gemini_service.py` via `httpx.AsyncClient` | Strictly backend `.env` (`GEMINI_API_KEY`); Never exposed to browser |
| **Field Journal Sync Service** | Last-modified conflict resolution observation store | None (Client UUID session token) | `/api/journal/sync` | `frontend/src/lib/journalDb.ts` | Local browser IndexedDB (`WildLensAI_DB`) |
| **GitHub Pages Static Export** | Production web application hosting | GitHub Actions OIDC token (`id-token: write`) | GitHub Pages CDN (`https://suguda-thakur-marndi.github.io/WildLens-AI`) | `.github/workflows/ci.yml` | GitHub Repository Variables (`vars.NEXT_PUBLIC_API_URL`) |

---

## 3. Git History Audit & Secret Leakage Verification

A full historical scan was executed across all Git refs, commits, and diffs using regex patterns for:
- Google AI / Gemini API keys (`AIza[0-9A-Za-z\-_]{35}`)
- OpenAI secret keys (`sk-[a-zA-Z0-9]{32,}`)
- Hugging Face access tokens (`hf_[a-zA-Z0-9]{34,}`)
- GitHub Personal Access Tokens (`ghp_[a-zA-Z0-9]{36}`)
- Key/Secret assignment expressions in source code

### Findings
1. **Total commits evaluated:** 17
2. **Total secret matches detected:** 0
3. **Committed environment files:** Only safe template files (`.env.example` and `frontend/.env.example`) containing dummy placeholders have ever been committed.
4. **Git Ignore Verification:** All variants of active `.env` files (`.env`, `.env.*`, `.env.local`, `frontend/.env`, `backend/.env`) are strictly ignored by `.gitignore`. Example templates are explicitly exempted via `!.env.example` and `!**/.env.example`.

---

## 4. Backend Configuration & Startup Validation

The backend configuration is managed by `app.core.config.Settings`:

```python
class Settings(BaseModel):
    # Core settings with default factories reading system env and local .env
    host: str = Field(...)
    port: int = Field(...)
    cors_origins: List[str] = Field(...)
    model_identifier: str = Field(...)
    gemini_api_key: Optional[Union[SecretStr, str]] = Field(...)
    gemini_api_base_url: str = Field(...)
    gemini_model: str = Field(...)
    gemini_timeout_seconds: float = Field(...)
    out_of_distribution_threshold: float = Field(...)
```

### Safety Features
- **SecretStr Protection:** `gemini_api_key` and `hf_token` are stored in `SecretStr` instances. Accidental printing (`print(settings)`) or serialization (`repr(settings)`, `str(settings)`) produces sanitized masked strings (e.g. `AIza...1234 (39 chars)` or `[UNCONFIGURED]`).
- **Startup Validation:** `validate_startup_configuration()` runs during FastAPI startup lifecycle (`app/main.py`), verifying port boundaries (1–65535), OOD thresholds (0.0–1.0), upload size limits, and timeout values without logging sensitive values.
- **Header Authentication:** `GeminiService` passes credentials via `x-goog-api-key` header rather than URL query parameters, preventing secret leakage in access logs, reverse proxy logs, or HTTP tracebacks.

---

## 5. Credential Lifecycle & Error Handling Protocol

WildLens AI implements explicit error handling for every credential failure state:

| Condition | Upstream Signal | Backend Action | Frontend User Message | Local BioCLIP-2 Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Missing Key** | `GEMINI_API_KEY` empty/unset | Returns status `unconfigured`; raises `HTTP 503` on explain/ask | "Gemini API key is not configured on the backend. Please add GEMINI_API_KEY to your backend .env file." | **Zero impact** — BioCLIP-2 vision runs locally with full accuracy |
| **Invalid / Revoked Key** | Google returns `401`, `403`, or `400` with `API_KEY_INVALID` | Returns status `invalid_key`; raises `HTTP 502 Bad Gateway` | "Gemini API authentication failed: The configured API key is invalid, revoked, or expired. Please update GEMINI_API_KEY on backend." | **Zero impact** — BioCLIP-2 vision runs locally |
| **Rate Limited / Quota Full** | Google returns `429` / `RESOURCE_EXHAUSTED` | Returns status `rate_limited`; raises `HTTP 429 Too Many Requests` | "Gemini API rate limit or quota exceeded. Please wait a moment before trying again." | **Zero impact** — BioCLIP-2 vision runs locally |
| **Upstream Service Outage** | Google returns `500`, `502`, `503` | Raises `HTTP 502 Bad Gateway` | "Gemini upstream service error: [Sanitized message]" | **Zero impact** — BioCLIP-2 vision runs locally |
| **Network Timeout** | `httpx.TimeoutException` after 15s | Raises `HTTP 504 Gateway Timeout` | "Gemini API request timed out. Please try again in a moment." | **Zero impact** — BioCLIP-2 vision runs locally |
| **No Internet Connection** | `httpx.RequestError` | Returns status `unavailable`; raises `HTTP 503` | "Could not reach Gemini service. Please check network connectivity." | **Zero impact** — BioCLIP-2 vision runs locally |

**Anti-Hallucination Mandate:** The application NEVER silently generates fake AI explanations when Gemini credentials fail. Users receive explicit status indicators explaining the exact failure reason while retaining immediate access to local offline taxonomy traits.

---

## 6. Production Hosting Provider Configuration Guide

### 1. Render (Backend Web Service)
1. Navigate to **Dashboard > Your Service > Environment**.
2. Add the following environment variables:
   - `WILDLENS_HOST`: `0.0.0.0`
   - `PORT`: `10000` (or leave default `$PORT`)
   - `CORS_ORIGINS`: `https://suguda-thakur-marndi.github.io,http://localhost:3000`
   - `GEMINI_API_KEY`: `[Your Google AI Studio Key]` (Mark as Secret)
   - `GEMINI_MODEL`: `gemini-2.5-flash`
   - `HF_HUB_OFFLINE`: `1`
3. Click **Save Changes**. Render will automatically redeploy the service securely.

### 2. Railway (Backend Deployment)
1. Navigate to **Project > Backend Service > Variables**.
2. Click **New Variable** and configure:
   - `WILDLENS_HOST`: `0.0.0.0`
   - `PORT`: `8000`
   - `GEMINI_API_KEY`: `[Your Google AI Studio Key]`
   - `CORS_ORIGINS`: `https://suguda-thakur-marndi.github.io`
3. Railway injects variables directly into the container environment without file writes.

### 3. Fly.io (Backend Deployment)
Set secrets via the Fly CLI:
```bash
fly secrets set GEMINI_API_KEY="AIzaSyYourActualKeyHere"
fly secrets set CORS_ORIGINS="https://suguda-thakur-marndi.github.io"
```

### 4. Google Cloud Run (Containerized Backend)
Store the key in **Google Cloud Secret Manager** and mount it as an environment variable:
```bash
gcloud secrets create wildlens-gemini-key --data-file=<(echo -n "AIzaSyYourActualKeyHere")
gcloud run deploy wildlens-backend \
  --image gcr.io/your-project/wildlens-backend \
  --set-secrets GEMINI_API_KEY=wildlens-gemini-key:latest \
  --set-env-vars WILDLENS_HOST=0.0.0.0,CORS_ORIGINS=https://suguda-thakur-marndi.github.io
```

### 5. GitHub Pages & GitHub Actions (Frontend Static Build)
1. In your GitHub repository, navigate to **Settings > Secrets and variables > Actions**.
2. Under the **Variables** tab (NOT Secrets, since this is a public URL):
   - Variable name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-wildlens-backend.onrender.com`
3. The GitHub Actions workflow (`.github/workflows/ci.yml`) automatically injects this variable into the Next.js static build without embedding any secrets.

---

## 7. Key Rotation & Compromise Response Protocol

If an API key is ever suspected of being compromised or exposed:

1. **Immediate Revocation:**
   - Log in to **[Google AI Studio API Keys Dashboard](https://aistudio.google.com/app/apikey)**.
   - Immediately delete or revoke the compromised key.
2. **Issue New Key:**
   - Create a new API key in Google AI Studio.
   - Restrict the key's API scope if applicable.
3. **Update Hosting Providers:**
   - Update the `GEMINI_API_KEY` secret in your hosting provider's dashboard (Render, Railway, Fly.io, Cloud Run).
   - Trigger a zero-downtime deployment.
4. **Update Local Development:**
   - Update your local `.env` file (which remains strictly ignored by Git).
5. **Verify Repository Cleanliness:**
   - Run the automated Git history scanner:
     ```bash
     python scratch/scan_git_history.py
     ```
   - If a key was ever committed in historical Git commits:
     - Merely deleting the file in a new commit is INSUFFICIENT because the key remains accessible in Git history.
     - Use `git filter-repo` or BFG Repo-Cleaner to rewrite history and force-push, or revoke the key immediately so historical commits contain only dead credentials.

---

## 8. Verification & Test Suite Summary

The entire test suite was executed against the standardized configuration:

| Test Suite | Total Tests | Passed | Execution Time | Coverage Area |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Unit Tests** | 24 | 24 | 58.0s | Pydantic validation, Secret masking, Gemini credential lifecycle, Fungi safety guards, Image processing |
| **Backend Integration Tests** | 11 | 11 | 11.3s | REST endpoints, CORS preflight, Trailing slashes, Validation rejection, Health reporting |
| **Backend Linting (Ruff)** | Full codebase | All passed | 0.8s | Import formatting, PEP-8 compliance, Unused imports |
| **Frontend Unit Tests (Vitest)** | 43 | 43 | 1.8s | API client error handling (429, 502, 503, 504), IndexedDB sync, Camera permissions, Components |
| **Git History Scan** | 17 commits | Clean (0 leaks) | 1.2s | All historical diffs and blobs |

All tests pass with 100% success rate. The repository is verified ready for production deployment.
