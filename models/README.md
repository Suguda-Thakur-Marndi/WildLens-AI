# BioCLIP-2 Model Artifacts & Weight Specifications

## Selected Open-Weight Foundation Model
- **Model Identifier:** `imageomics/bioclip-2` (Configurable via `VISION_MODEL_ID`, default: `imageomics/bioclip-2`)
- **Architecture:** OpenCLIP ViT-L/14 (Vision Transformer Large, 14x14 patch size, 768-dim embeddings, 24 visual layers, width 1024)
- **Revision / Tag:** `2957b322090f9cb17ae72c71981c7218a28d81e0` (Pinned safetensors checkpoint)
- **License:** MIT License (Permissive Open Source)
- **Origin / Research Team:** Imageomics Institute (Ohio State University, Smithsonian Institution, et al.)
- **Paper:** *BioCLIP: A Vision Foundation Model for the Tree of Life* (CVPR 2024) & BioCLIP-2 (TreeOfLife-200M)

## Dataset & Training Data
- **Dataset:** TreeOfLife-200M (Over 200,000,000 biological images spanning ~454,000 taxa)
- **Taxonomic Hierarchy Grounding:** Trained explicitly with biological ranks:
  `Kingdom > Phylum > Class > Order > Family > Genus > Species`
- **Data Sources:** iNaturalist, Encyclopedia of Life (EOL), and museum herbarium/vertebrate collections.

## Weights Storage & Caching
Weights are saved in the project-relative local directory:
`models/bioclip_cache/`

### Weight File Checklist
- `open_clip_model.safetensors` (~1.7 GB)
- `open_clip_config.json`
- `taxa_embeddings_imageomics_bioclip-2_768_*.pt` (Cached precomputed 768-dimensional candidate lineage embeddings)

## Measured Memory & Hardware Specifications
| Mode | Target Device | RAM / VRAM | Warmup Latency | Average Inference Latency |
| :--- | :--- | :--- | :--- | :--- |
| **CPU** | Intel Core i7-13700HX (x86_64, 16 threads, fp32) | ~1.82 GB RAM (weights) / 2.04 GB peak | ~38.3 s (cold deserialization) | ~2,560 ms |
| **GPU** | NVIDIA GeForce RTX 5060 Laptop (CUDA fp16) | ~1.2 GB VRAM | ~3.5 seconds | ~50 - 90 ms |

## Standalone Single-Model VRAM Management
WildLens AI runs BioCLIP-2 as the **sole** AI foundation model:
- `VISION_DEVICE=auto|cuda|cpu` chooses device automatically.
- Uses fp16 on CUDA for low memory overhead and fast inference.
- If GPU VRAM headroom is under 500 MB or CUDA is unavailable, `BioClipService` gracefully falls back to CPU to ensure uninterrupted execution without crashing.

## Offline Guarantees
Once downloaded, the model runs strictly offline with:
```bash
export HF_HUB_OFFLINE=1
```
The BioCLIP service validates local disk presence, uses `local_files_only=True`, and executes with zero external network egress.
