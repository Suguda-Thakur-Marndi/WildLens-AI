# Hardware Benchmarks & Performance Profile

## Test Rig Specifications
- **Processor:** 13th Gen Intel(R) Core(TM) i7-13700HX (16 Cores / 24 Threads)
- **Base / Boost Frequency:** 2.1 GHz / 5.0 GHz
- **System Memory:** 16 GB DDR5 RAM
- **GPU (Physical):** NVIDIA GeForce RTX 5060 Laptop GPU (8,151 MiB VRAM)
- **Active Execution Target:** Multi-threaded PyTorch CPU Engine (16 threads)
- **Vision Foundation Model:** `imageomics/bioclip-2` (OpenCLIP ViT-L/14, 200M images TreeOfLife-200M, MIT License)
- **Model Checkpoint Size:** ~1.7 GB safetensors (`open_clip_model.safetensors`, 768-dim embeddings)
- **Language Layer:** Qwen/Qwen3-8B (4-bit NF4 quantized, Apache-2.0)

---

## Measured Benchmark Results (21 Specimen Photos)

Evaluated using `scripts/benchmark_hardware.py` across diverse biodiversity clades including birds, plants, insects, fungi, vertebrates, and hard/ambiguous/OOD test specimens:

| Image Subject | Clade / Category | Primary Species Identified | Cosine Sim | Softmax Conf | Status | Measured CPU Latency | Match |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **American Robin** (`american_robin.jpg`) | Aves | American Robin (*Turdus migratorius*) | **0.722** | **100.0%** | `confident` | **3,375.6 ms** | [PASS] |
| **Blue Jay** (`blue_jay.jpg`) | Aves | Blue Jay (*Cyanocitta cristata*) | **0.726** | **100.0%** | `confident` | **3,343.6 ms** | [PASS] |
| **Red-tailed Hawk** (`red_tailed_hawk.jpg`) | Aves | Red-tailed Hawk (*Buteo jamaicensis*) | **0.710** | **100.0%** | `confident` | **3,380.7 ms** | [PASS] |
| **White Oak Leaf** (`white_oak_leaf.jpg`) | Plantae | White Oak (*Quercus alba*) | **0.729** | **100.0%** | `confident` | **3,520.7 ms** | [PASS] |
| **Northern Red Oak** (`northern_red_oak_leaf.jpg`) | Plantae (Lookalike) | Northern Red Oak (*Quercus rubra*) | **0.693** | **61.0%** | `confident` | **3,289.2 ms** | [PASS] |
| **Liverleaf (Hepatica)** (`hepatica_nobilis.jpg`) | Plantae | Liverleaf (*Hepatica nobilis*) | **0.747** | **100.0%** | `confident` | **3,335.0 ms** | [PASS] |
| **Harebell Flower** (`harebell_flower.jpg`) | Plantae | Harebell (*Campanula rotundifolia*) | **0.673** | **99.2%** | `confident` | **3,484.2 ms** | [PASS] |
| **Attached Blue Flower** (`attached_blue_flower.jpg`) | Plantae | Harebell (*Campanula rotundifolia*) | **0.675** | **99.2%** | `confident` | **3,265.4 ms** | [PASS] |
| **Yellow Trout Lily** (`yellow_trout_lily.jpg`) | Plantae | Yellow Trout Lily (*Erythronium americanum*) | **0.733** | **99.7%** | `confident` | **3,598.3 ms** | [PASS] |
| **Eastern Poison Ivy** (`eastern_poison_ivy.jpg`) | Plantae | Eastern Poison Ivy (*Toxicodendron radicans*) | **0.725** | **100.0%** | `confident` | **3,263.4 ms** | [PASS] |
| **Monarch Butterfly** (`monarch_butterfly.jpg`) | Insecta | Monarch Butterfly (*Danaus plexippus*) | **0.703** | **99.8%** | `confident` | **3,456.1 ms** | [PASS] |
| **Viceroy Butterfly** (`viceroy_butterfly.jpg`) | Insecta (Lookalike) | Viceroy Butterfly (*Limenitis archippus*) | **0.732** | **100.0%** | `confident` | **3,322.7 ms** | [PASS] |
| **Western Honey Bee** (`western_honey_bee.jpg`) | Insecta | Western Honey Bee (*Apis mellifera*) | **0.712** | **100.0%** | `confident` | **3,404.1 ms** | [PASS] |
| **Fly Agaric** (`fly_agaric_mushroom.jpg`) | Fungi | Fly Agaric (*Amanita muscaria*) | **0.722** | **100.0%** | `confident` | **3,246.4 ms** | [PASS] |
| **Golden Chanterelle** (`golden_chanterelle.jpg`) | Fungi | Golden Chanterelle (*Cantharellus cibarius*) | **0.730** | **100.0%** | `confident` | **3,452.1 ms** | [PASS] |
| **Turkey Tail** (`turkey_tail_fungus.jpg`) | Fungi | Turkey Tail (*Trametes versicolor*) | **0.726** | **100.0%** | `confident` | **3,348.8 ms** | [PASS] |
| **Pearl Oyster Mushroom** (`pearl_oyster_mushroom.jpg`) | Fungi | Pearl Oyster Mushroom (*Pleurotus ostreatus*) | **0.735** | **100.0%** | `confident` | **3,515.8 ms** | [PASS] |
| **Eastern Chipmunk** (`eastern_chipmunk.jpg`) | Mammalia | Eastern Chipmunk (*Tamias striatus*) | **0.739** | **100.0%** | `confident` | **3,232.8 ms** | [PASS] |
| **Painted Turtle** (`painted_turtle.jpg`) | Reptilia | Painted Turtle (*Chrysemys picta*) | **0.738** | **100.0%** | `confident` | **3,327.8 ms** | [PASS] |
| **Tropical Foliage (OOD)** (`tropical_foliage.jpg`) | Out-of-Distribution | Bloodroot (Tentative NN, 0.549 < 0.60 threshold) | **0.549** | **21.4%** | `inconclusive` | **3,388.5 ms** | [PASS (Rejected)] |
| **Blurry Woodland Shadow** (`blurry_woodland_shadow.jpg`) | Ambiguous / Low SNR | Painted Turtle (Ambiguous nearest neighbor) | **0.676** | **29.4%** | `uncertain` | **3,241.2 ms** | [PASS (Uncertain)] |

### Summary Statistics & Measured Accuracy
- **In-Distribution Top-1 Accuracy:** **100.0% (19 / 19)**
- **In-Distribution Top-3 Accuracy:** **100.0% (19 / 19)**
- **Out-of-Distribution Rejection Rate:** **100.0% (1 / 1)** — Tropical foliage correctly rejected (`similarity 0.549 < 0.60 threshold`) with status `inconclusive` ("Not in my database").
- **Ambiguity Calibration Rate:** **100.0% (1 / 1)** — Low-light noisy woodland shadow flagged as `uncertain` ("Uncertain identification", 29.4% top probability with lookalikes within 2.4%).
- **Batesian Mimicry Disambiguation:**
  - Viceroy Butterfly identified as Viceroy (*Limenitis archippus*, 0.732) with Monarch as runner-up (0.652).
  - Monarch Butterfly identified as Monarch (*Danaus plexippus*, 0.703) with Viceroy as runner-up (0.641).
- **Mean Warm Inference Latency (CPU):** **3,371.1 ms** (~3.37 seconds per image on 16 threads)
- **GPU Inference Latency (Projected on RTX 5060, fp16):** **~60 - 95 ms**
- **Cold-Start Model Weight Loading:** **~37.86 s** (loading 1.7 GB safetensors + OpenCLIP ViT-L/14 architecture + taxonomy lineage embeddings)
- **Process Memory Overhead for BioCLIP-2:** **1,822.7 MB RAM**
- **Peak Process Resident RAM (Dual-Model Architecture):**
  - Standalone BioCLIP-2: **~2,043.4 MB RAM**
  - BioCLIP-2 + Qwen3-8B (4-bit NF4 language layer): **~7.5 GB RAM / VRAM** (reserves ~5.5 GB VRAM for language layer, falling back to CPU if GPU free VRAM < 1.0 GB)

---

## Hardware Sizing Guidelines
- **Minimum Requirements (Usable outdoors on laptop):**
  - 4-core x86_64 or Apple Silicon CPU
  - 4 GB available system RAM
  - 2 GB free disk space for cached BioCLIP-2 weights in `models/bioclip_cache/`
- **Recommended Hardware:**
  - 8+ core CPU or discrete NVIDIA GPU (RTX 3060 / 4060 / 5060 with 8 GB VRAM)
  - 16 GB DDR5 RAM
  - Fast NVMe SSD for weight deserialization
