# Contributing to WildLens AI

Thank you for your interest in contributing to **WildLens AI** for the **Hacktoberfest Open-Source AI Challenge (Week 1: Touch Grass)**!

## Our Guiding Principle
> **Use open-source AI to help people explore the real world, rather than keeping them engaged with their screens.**

Every contribution — whether code, taxonomy entries, UI enhancements, or outdoor missions — should uphold this core principle.

---

## Development Setup

### 1. Prerequisites
- Python 3.12+ (or 3.11+)
- Node.js 20+ & npm

### 2. Backend Setup
```bash
python -m venv .venv
# On Windows:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r backend/requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Running Backend
```bash
# From workspace root
uvicorn app.main:app --app-dir backend --reload --port 8000
```

---

## Testing Guidelines

### Backend Testing
Run automated pytest suite (including real BioCLIP inference and offline tests):
```bash
pytest backend/tests -v
```

### Frontend Testing & Build
```bash
cd frontend
npm test
npm run lint
npm run build
```

---

## Adding New Organisms to the Taxonomy Knowledgebase
To extend supported wild organisms, edit `backend/app/services/taxonomy_kb.py`:
1. Provide accurate binomial nomenclature (`scientific_name`) and recognized `common_name`.
2. Include complete taxonomic classification (`kingdom`, `phylum`, `class`, `order`, `family`, `genus`, `species`).
3. Detail authentic `visual_characteristics` and actionable `distinguishing_features` that users can inspect outdoors.
4. List common lookalike confusion species.
5. Provide a safe `field_verification_tip` encouraging real-world observation.
