# Hardware Benchmarks & Performance Profile

## Test Rig Specifications
- **Processor:** 13th Gen Intel(R) Core(TM) i7-13700HX (16 Cores / 24 Threads)
- **Base / Boost Frequency:** 2.1 GHz / 5.0 GHz
- **System Memory:** 16 GB DDR5 RAM
- **GPU (Physical):** NVIDIA GeForce RTX 5060 Laptop GPU (8,151 MiB VRAM)
- **Active Execution Target:** Multi-threaded PyTorch CPU Engine (16 threads, fp32)
- **Vision Foundation Model:** `imageomics/bioclip-2` (OpenCLIP ViT-L/14, 200M images TreeOfLife-200M, MIT License)
- **Model Checkpoint Size:** ~1.7 GB safetensors (`open_clip_model.safetensors`, 768-dim embeddings)
- **AI Architecture:** Single-Model Standalone Edge AI (Zero LLM / Language Layer overhead)

---

## Measured Benchmark Results (21 Authentic Specimen Photos)

Measured directly using `scripts/benchmark_hardware.py` across diverse biodiversity clades including birds, plants, insects, fungi, vertebrates, and hard/ambiguous/OOD test specimens:

| Image Subject | Clade / Category | Primary Species Identified | Cosine Sim | Softmax Conf | Status | Measured CPU Latency | Match |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **American Robin** (`american_robin.jpg`) | Aves | American Robin (*Turdus migratorius*) | **0.722** | **100.0%** | `confident` | **2,502.6 ms** | [PASS] |
| **Blue Jay** (`blue_jay.jpg`) | Aves | Blue Jay (*Cyanocitta cristata*) | **0.726** | **100.0%** | `confident` | **2,537.6 ms** | [PASS] |
| **Red-tailed Hawk** (`red_tailed_hawk.jpg`) | Aves | Red-tailed Hawk (*Buteo jamaicensis*) | **0.710** | **100.0%** | `confident` | **2,518.5 ms** | [PASS] |
| **White Oak Leaf** (`white_oak_leaf.jpg`) | Plantae | White Oak (*Quercus alba*) | **0.729** | **100.0%** | `confident` | **2,525.2 ms** | [PASS] |
| **Northern Red Oak** (`northern_red_oak_leaf.jpg`) | Plantae (Lookalike) | Northern Red Oak (*Quercus rubra*) | **0.693** | **61.0%** | `confident` | **2,559.4 ms** | [PASS] |
| **Liverleaf (Hepatica)** (`hepatica_nobilis.jpg`) | Plantae | Liverleaf (*Hepatica nobilis*) | **0.747** | **100.0%** | `confident` | **2,568.3 ms** | [PASS] |
| **Harebell Flower** (`harebell_flower.jpg`) | Plantae | Harebell (*Campanula rotundifolia*) | **0.673** | **99.2%** | `confident` | **2,542.4 ms** | [PASS] |
| **Attached Blue Flower** (`attached_blue_flower.jpg`) | Plantae | Harebell (*Campanula rotundifolia*) | **0.675** | **99.2%** | `confident` | **2,556.8 ms** | [PASS] |
| **Yellow Trout Lily** (`yellow_trout_lily.jpg`) | Plantae | Yellow Trout Lily (*Erythronium americanum*) | **0.733** | **99.7%** | `confident` | **2,612.1 ms** | [PASS] |
| **Eastern Poison Ivy** (`eastern_poison_ivy.jpg`) | Plantae | Eastern Poison Ivy (*Toxicodendron radicans*) | **0.725** | **100.0%** | `confident` | **2,624.6 ms** | [PASS] |
| **Monarch Butterfly** (`monarch_butterfly.jpg`) | Insecta | Monarch Butterfly (*Danaus plexippus*) | **0.703** | **99.8%** | `confident` | **2,600.0 ms** | [PASS] |
| **Viceroy Butterfly** (`viceroy_butterfly.jpg`) | Insecta (Lookalike) | Viceroy Butterfly (*Limenitis archippus*) | **0.732** | **100.0%** | `confident` | **2,576.3 ms** | [PASS] |
| **Western Honey Bee** (`western_honey_bee.jpg`) | Insecta | Western Honey Bee (*Apis mellifera*) | **0.712** | **100.0%** | `confident` | **2,515.3 ms** | [PASS] |
| **Fly Agaric** (`fly_agaric_mushroom.jpg`) | Fungi | Fly Agaric (*Amanita muscaria*) | **0.722** | **100.0%** | `confident` | **2,571.0 ms** | [PASS] |
| **Golden Chanterelle** (`golden_chanterelle.jpg`) | Fungi | Golden Chanterelle (*Cantharellus cibarius*) | **0.730** | **100.0%** | `confident` | **2,579.2 ms** | [PASS] |
| **Turkey Tail** (`turkey_tail_fungus.jpg`) | Fungi | Turkey Tail (*Trametes versicolor*) | **0.726** | **100.0%** | `confident` | **2,558.5 ms** | [PASS] |
| **Pearl Oyster Mushroom** (`pearl_oyster_mushroom.jpg`) | Fungi | Pearl Oyster Mushroom (*Pleurotus ostreatus*) | **0.735** | **100.0%** | `confident` | **2,551.2 ms** | [PASS] |
| **Eastern Chipmunk** (`eastern_chipmunk.jpg`) | Mammalia | Eastern Chipmunk (*Tamias striatus*) | **0.739** | **100.0%** | `confident` | **2,561.5 ms** | [PASS] |
| **Painted Turtle** (`painted_turtle.jpg`) | Reptilia | Painted Turtle (*Chrysemys picta*) | **0.738** | **100.0%** | `confident` | **2,565.5 ms** | [PASS] |
| **Tropical Foliage (OOD)** (`tropical_foliage.jpg`) | Out-of-Distribution | Bloodroot (Tentative NN, 0.549 < 0.60 threshold) | **0.549** | **21.4%** | `inconclusive` | **2,575.6 ms** | [PASS (Rejected)] |
| **Blurry Woodland Shadow** (`blurry_woodland_shadow.jpg`) | Ambiguous / Low SNR | Painted Turtle (Ambiguous nearest neighbor) | **0.676** | **29.4%** | `uncertain` | **2,557.2 ms** | [PASS (Uncertain)] |

### Summary Statistics & Measured Accuracy
- **In-Distribution Top-1 Accuracy:** **100.0% (19 / 19)** across in-catalog specimens
- **In-Distribution Top-3 Accuracy:** **100.0% (19 / 19)**
- **Out-of-Distribution Rejection Rate:** **100.0% (1 / 1)** — Tropical foliage correctly rejected (`similarity 0.549 < 0.60 threshold`) with status `inconclusive`.
- **Ambiguity Calibration Rate:** **100.0% (1 / 1)** — Low-light noisy woodland shadow flagged as `uncertain` (29.4% top density with lookalikes within 2.4%).
- **Batesian Mimicry Disambiguation:**
  - Viceroy Butterfly identified as Viceroy (*Limenitis archippus*, 0.732) with Monarch as runner-up (0.652).
  - Monarch Butterfly identified as Monarch (*Danaus plexippus*, 0.703) with Viceroy as runner-up (0.641).
- **Mean Warm Inference Latency (CPU):** **2,559.9 ms** (~2.56 seconds per image on 16 threads)
- **Projected GPU Inference Latency (RTX 5060, fp16 CUDA):** **~50 - 90 ms**
- **Cold-Start Model Weight Loading:** **38.34 s** (loading 1.7 GB safetensors + OpenCLIP ViT-L/14 architecture + taxonomy lineage embeddings)
- **Process Memory Overhead for BioCLIP-2:** **1,822.9 MB RAM**
- **Peak Process Resident RAM:** **2,044.9 MB RAM** (single standalone vision model, no LLM overhead)

---

## Hardware Sizing Guidelines
- **Minimum Requirements (Usable outdoors on lightweight laptop):**
  - 4-core x86_64 or Apple Silicon CPU
  - 4 GB available system RAM (total peak app memory is ~2.04 GB)
  - 2 GB free disk space for cached BioCLIP-2 weights in `models/bioclip_cache/`
- **Recommended Hardware:**
  - 8+ core CPU or discrete NVIDIA GPU (RTX 3060 / 4060 / 5060 with 6+ GB VRAM for sub-100ms inference)
  - 8–16 GB system RAM
  - Fast NVMe SSD for quick cold-start weight deserialization
