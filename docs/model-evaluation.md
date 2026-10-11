# Model Evaluation & Taxonomic Analysis

This document details the selection, benchmark performance, taxonomic coverage, uncertainty calibration, open advantage, and limitations of the open-weight AI model driving **WildLens AI**.

---

## 1. Model Selection & Provenance

| Property | Value |
|---|---|
| **Model Name** | `imageomics/bioclip-2` (Configurable via `VISION_MODEL_ID`) |
| **Architecture** | Vision Transformer (ViT-L/14), OpenCLIP architecture (768-dim embedding, 24 layers, width 1024, patch size 14) |
| **License** | MIT License (Permissive Open Source) |
| **Checkpoint Size** | ~1.7 GB (`open_clip_model.safetensors`) |
| **Training Corpus** | TreeOfLife-200M (200 million biological images across the Tree of Life) |
| **Runtime Engine** | PyTorch 2.14+ / OpenCLIP |

### Why BioCLIP-2?
Standard computer vision models (e.g., ImageNet-trained models or general-purpose VLMs) struggle when identifying organisms in the wild because they lack fine-grained taxonomic hierarchies. General models often group all birds into vague categories, hallucinate fictitious binomial nomenclature, or require 8–14 GB VRAM to run.

BioCLIP-2 scales the biological visual pretraining dataset from 10 million to **200 million biological images** (TreeOfLife-200M) trained on the comprehensive Tree of Life taxonomy hierarchy by Imageomics, the Ohio Supercomputer Center, and collaborators. Upgrading from ViT-B/16 (512-dim) to ViT-L/14 (768-dim) enables the model to resolve subtle morphological features such as leaf margin serrations, wing venation, and pileus gills, while remaining completely **MIT-licensed** and running locally without cloud egress.

---

## 2. Empirical Benchmark Evaluation

Evaluation was measured directly on an Intel Core i7-13700HX CPU (16 physical cores, 24 threads, 16 GB DDR5 RAM, NVIDIA RTX 5060 Laptop GPU) across 21 authentic nature specimen photographs using `scripts/benchmark_hardware.py`:

| Test Sample | Clade / Category | True Organism | Top-1 Predicted Species | Cosine Sim | Softmax Conf | Latency (CPU) | Result |
|---|---|---|---|---|---|---|---|
| `american_robin.jpg` | Aves | *Turdus migratorius* | American Robin (*Turdus migratorius*) | **0.722** | **100.0%** | **2,502.6 ms** | **Correct** |
| `blue_jay.jpg` | Aves | *Cyanocitta cristata* | Blue Jay (*Cyanocitta cristata*) | **0.726** | **100.0%** | **2,537.6 ms** | **Correct** |
| `red_tailed_hawk.jpg` | Aves | *Buteo jamaicensis* | Red-tailed Hawk (*Buteo jamaicensis*) | **0.710** | **100.0%** | **2,518.5 ms** | **Correct** |
| `white_oak_leaf.jpg` | Plantae | *Quercus alba* | White Oak (*Quercus alba*) | **0.729** | **100.0%** | **2,525.2 ms** | **Correct** |
| `northern_red_oak_leaf.jpg` | Plantae (Lookalike) | *Quercus rubra* | Northern Red Oak (*Quercus rubra*) | **0.693** | **61.0%** | **2,559.4 ms** | **Correct** |
| `hepatica_nobilis.jpg` | Plantae | *Hepatica nobilis* | Liverleaf (*Hepatica nobilis*) | **0.747** | **100.0%** | **2,568.3 ms** | **Correct** |
| `harebell_flower.jpg` | Plantae | *Campanula rotundifolia* | Harebell (*Campanula rotundifolia*) | **0.673** | **99.2%** | **2,542.4 ms** | **Correct** |
| `attached_blue_flower.jpg` | Plantae | *Campanula rotundifolia* | Harebell (*Campanula rotundifolia*) | **0.675** | **99.2%** | **2,556.8 ms** | **Correct** |
| `yellow_trout_lily.jpg` | Plantae | *Erythronium americanum* | Yellow Trout Lily (*Erythronium americanum*) | **0.733** | **99.7%** | **2,612.1 ms** | **Correct** |
| `eastern_poison_ivy.jpg` | Plantae | *Toxicodendron radicans* | Eastern Poison Ivy (*Toxicodendron radicans*) | **0.725** | **100.0%** | **2,624.6 ms** | **Correct** |
| `monarch_butterfly.jpg` | Insecta | *Danaus plexippus* | Monarch Butterfly (*Danaus plexippus*) | **0.703** | **99.8%** | **2,600.0 ms** | **Correct** |
| `viceroy_butterfly.jpg` | Insecta (Lookalike) | *Limenitis archippus* | Viceroy Butterfly (*Limenitis archippus*) | **0.732** | **100.0%** | **2,576.3 ms** | **Correct** |
| `western_honey_bee.jpg` | Insecta | *Apis mellifera* | Western Honey Bee (*Apis mellifera*) | **0.712** | **100.0%** | **2,515.3 ms** | **Correct** |
| `fly_agaric_mushroom.jpg` | Fungi | *Amanita muscaria* | Fly Agaric (*Amanita muscaria*) | **0.722** | **100.0%** | **2,571.0 ms** | **Correct** |
| `golden_chanterelle.jpg` | Fungi | *Cantharellus cibarius* | Golden Chanterelle (*Cantharellus cibarius*) | **0.730** | **100.0%** | **2,579.2 ms** | **Correct** |
| `turkey_tail_fungus.jpg` | Fungi | *Trametes versicolor* | Turkey Tail (*Trametes versicolor*) | **0.726** | **100.0%** | **2,558.5 ms** | **Correct** |
| `pearl_oyster_mushroom.jpg` | Fungi | *Pleurotus ostreatus* | Pearl Oyster Mushroom (*Pleurotus ostreatus*) | **0.735** | **100.0%** | **2,551.2 ms** | **Correct** |
| `eastern_chipmunk.jpg` | Mammalia | *Tamias striatus* | Eastern Chipmunk (*Tamias striatus*) | **0.739** | **100.0%** | **2,561.5 ms** | **Correct** |
| `painted_turtle.jpg` | Reptilia | *Chrysemys picta* | Painted Turtle (*Chrysemys picta*) | **0.738** | **100.0%** | **2,565.5 ms** | **Correct** |
| `tropical_foliage.jpg` | OOD | *Unrepresented in catalog* | Bloodroot (*Tentative NN*, 0.549) | **0.549** | **21.4%** | **2,575.6 ms** | **Inconclusive (OOD)** |
| `blurry_woodland_shadow.jpg` | Ambiguous | *Low-SNR shadow* | Painted Turtle (*Ambiguous NN*, 0.676) | **0.676** | **29.4%** | **2,557.2 ms** | **Uncertain** |

- **In-Distribution Top-1 Accuracy**: **100.0% (19 / 19)** on the evaluated catalog specimens
- **In-Distribution Top-3 Accuracy**: **100.0% (19 / 19)**
- **Out-of-Distribution Rejection Rate**: **100.0% (1 / 1)** (Tropical foliage rejected with status `inconclusive` below 0.60 threshold)
- **Ambiguity Calibration Rate**: **100.0% (1 / 1)** (Blurry shadow classified as `uncertain` with narrow lookalike margin)
- **Mean Warm Inference Latency (CPU)**: **2,559.9 ms** (~2.56 seconds per image on 16 threads)
- **Projected GPU Latency (CUDA fp16)**: **~50 - 90 ms**
- **Model Weight RAM Footprint**: **1,822.9 MB RAM** (2,044.9 MB peak process resident RAM)
- **External Network Calls During Inference**: **0** (Enforced offline via loopback-only socket guards)

---

## 3. Calibrated Uncertainty Thresholds

Softmax logit scales and cosine score distributions differ between BioCLIP (ViT-B/16) and BioCLIP-2 (ViT-L/14). In BioCLIP-2, uncalibrated logit scale $\exp(\text{logit\_scale}) \approx 100.0$. To avoid misleading users with exaggerated closed-set softmax probabilities, WildLens AI separates:

1. **Geometric Cosine Similarity** ($s \in [-1, 1]$): Direct alignment between image and text lineage embeddings.
2. **Softmax Probability Density** ($p \in [0, 1]$): Relative closed-set mass across the candidate catalog.
3. **Probability Margin** ($\Delta = p_{\text{top1}} - p_{\text{top2}}$): Margin between top-1 and runner-up candidate.

```python
# BioCLIP-2 ViT-L/14 Decision Logic:
ood_threshold = float(getattr(settings, "out_of_distribution_threshold", 0.60))

if primary_similarity < ood_threshold:
    confidence_status = "inconclusive"
    # Surfaces "Not in my database" — does NOT assign a confirmed primary match
elif primary_similarity >= 0.65 and top1_prob >= 0.60 and prob_margin >= 0.25:
    confidence_status = "confident"
elif primary_similarity >= 0.60 and top1_prob >= 0.35:
    confidence_status = "moderate"
else:
    confidence_status = "uncertain"
```

### Uncertainty Ratings & Confidence Bands:
1. **`likely` (`confident`)**: Emerald badge. High visual similarity ($\ge 0.65$), high softmax mass ($\ge 0.60$), and distinct margin ($\ge 0.25$) over alternatives.
2. **`possible` (`moderate`)**: Amber badge. Prompts the user: *"Possible match — examine distinguishing field marks outdoors."*
3. **`unsure` (`uncertain` / `inconclusive`)**: Gray/subtle badge. Indicates low similarity or narrow margin to lookalikes. Suggests inspecting physical leaf venation, bark, and habitat.

---

## 4. Open Advantage

WildLens AI is built on four core principles of open scientific AI:
- **One Open Model**: Single foundation vision model (`imageomics/bioclip-2`, MIT license) rather than chained opaque LLM APIs.
- **100% Local & Air-Gapped**: Runs entirely on your hardware with zero network connectivity required in the field.
- **Zero Cost & No Accounts**: No subscription fees, no API tokens, no telemetry tracking, and no required sign-in.
- **Data Privacy**: Your camera stream, field photos, and GPS metadata never leave your physical device.
- **Swappable Architecture**: Configurable via `VISION_MODEL_ID` (e.g. swap back to `imageomics/bioclip` with zero code modifications). The system automatically detects model dimension changes and invalidates old embedding caches safely.

---

## 5. Field Test (Outdoor Observations)

*The following section contains placeholder tables for logging real-world outdoor field tests across diverse weather and lighting conditions. Results should be entered manually from actual field outings.*

| Date | Location | Weather / Light Condition | Organism Observed | Model Prediction | Confidence Band | Field Notes / Ground Truth Verification |
|---|---|---|---|---|---|---|
| *YYYY-MM-DD* | *e.g. Hemlock Ravine Trail* | *Dappled sunlight, overcast* | *e.g. Quercus alba* | *White Oak* | *Likely* | *Verified rounded lobes without bristle tips.* |
| *YYYY-MM-DD* | *e.g. Wet meadow border* | *Direct noon sunlight* | *e.g. Danaus plexippus* | *Monarch Butterfly* | *Likely* | *Verified lack of black post-median hindwing band.* |
| *YYYY-MM-DD* | *[Your field test]* | *[Lighting/weather]* | *[Specimen]* | *[Prediction]* | *[Band]* | *[Manual verification notes]* |
| *YYYY-MM-DD* | *[Your field test]* | *[Lighting/weather]* | *[Specimen]* | *[Prediction]* | *[Band]* | *[Manual verification notes]* |

---

## 6. Model Limitations & Safety Guardrails

1. **Macro / Microscope Scale**: BioCLIP-2 was trained on field photographs. It is not calibrated for microscopic cellular or spore morphology.
2. **Juvenile vs. Adult Stages**: Nymphs, larvae, and seedlings may score lower similarity than mature specimens.
3. **Mandatory Fungi Safety Guard**: The platform strictly prohibits using model output for foraging, edible mushroom harvesting, or medicinal usage. Every fungi identification unconditionally triggers the mandatory warning: *"Never eat wild mushrooms based on this app."*
