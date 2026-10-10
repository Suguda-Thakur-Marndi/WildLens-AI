# Model Evaluation & Taxonomic Analysis

This document details the selection, benchmark performance, taxonomic coverage, uncertainty calibration, and limitations of the open-weight AI model driving **WildLens AI**.

---

## 1. Model Selection & Provenance

| Property | Value |
|---|---|
| **Model Name** | `imageomics/bioclip-2` |
| **Architecture** | Vision Transformer (ViT-L/14), OpenCLIP architecture (768-dim embedding, 24 layers, width 1024, patch size 14) |
| **License** | MIT License (Permissive Open Source) |
| **Checkpoint Size** | ~1.7 GB (`open_clip_model.safetensors`) |
| **Training Corpus** | TreeOfLife-200M (200 million biological images across ~454,000 biological taxa) |
| **Runtime Engine** | PyTorch 2.14+ / OpenCLIP |

### Why BioCLIP-2?
Standard computer vision models (e.g., ImageNet-trained models) fail when identifying organisms in the wild because they lack fine-grained taxonomic hierarchies. Conventional models group all birds into vague categories or hallucinate binomial nomenclature.

BioCLIP-2 scales the biological visual pretraining dataset from 10 million to **200 million biological images** (a 20x dataset scale) trained on the comprehensive Tree of Life taxonomy hierarchy by Imageomics, the Ohio Supercomputer Center, and collaborators. Upgrading from ViT-B/16 (512-dim) to ViT-L/14 (768-dim) enables the model to resolve subtle morphometric features such as leaf margin serrations, wing venation, and pileus gills, while remaining completely **MIT-licensed** and permissible for open-source offline deployment.

---

## 2. Empirical Benchmark Evaluation

Evaluation was performed on an Intel Core i7-13700HX CPU (16 physical cores, 24 threads, 16 GB DDR5 RAM, NVIDIA RTX 5060 Laptop GPU) across 21 authentic nature specimen photographs:

| Test Sample | Clade / Category | True Organism | Top-1 Predicted Species | Cosine Sim | Softmax Conf | Latency (CPU) | Result |
|---|---|---|---|---|---|---|---|
| `american_robin.jpg` | Aves | *Turdus migratorius* | American Robin (*Turdus migratorius*) | **0.722** | **100.0%** | **3,375.6 ms** | **Correct** |
| `blue_jay.jpg` | Aves | *Cyanocitta cristata* | Blue Jay (*Cyanocitta cristata*) | **0.726** | **100.0%** | **3,343.6 ms** | **Correct** |
| `red_tailed_hawk.jpg` | Aves | *Buteo jamaicensis* | Red-tailed Hawk (*Buteo jamaicensis*) | **0.710** | **100.0%** | **3,380.7 ms** | **Correct** |
| `white_oak_leaf.jpg` | Plantae | *Quercus alba* | White Oak (*Quercus alba*) | **0.729** | **100.0%** | **3,520.7 ms** | **Correct** |
| `northern_red_oak_leaf.jpg` | Plantae (Lookalike) | *Quercus rubra* | Northern Red Oak (*Quercus rubra*) | **0.693** | **61.0%** | **3,289.2 ms** | **Correct** |
| `hepatica_nobilis.jpg` | Plantae | *Hepatica nobilis* | Liverleaf (*Hepatica nobilis*) | **0.747** | **100.0%** | **3,335.0 ms** | **Correct** |
| `harebell_flower.jpg` | Plantae | *Campanula rotundifolia* | Harebell (*Campanula rotundifolia*) | **0.673** | **99.2%** | **3,484.2 ms** | **Correct** |
| `attached_blue_flower.jpg` | Plantae | *Campanula rotundifolia* | Harebell (*Campanula rotundifolia*) | **0.675** | **99.2%** | **3,265.4 ms** | **Correct** |
| `yellow_trout_lily.jpg` | Plantae | *Erythronium americanum* | Yellow Trout Lily (*Erythronium americanum*) | **0.733** | **99.7%** | **3,598.3 ms** | **Correct** |
| `eastern_poison_ivy.jpg` | Plantae | *Toxicodendron radicans* | Eastern Poison Ivy (*Toxicodendron radicans*) | **0.725** | **100.0%** | **3,263.4 ms** | **Correct** |
| `monarch_butterfly.jpg` | Insecta | *Danaus plexippus* | Monarch Butterfly (*Danaus plexippus*) | **0.703** | **99.8%** | **3,456.1 ms** | **Correct** |
| `viceroy_butterfly.jpg` | Insecta (Lookalike) | *Limenitis archippus* | Viceroy Butterfly (*Limenitis archippus*) | **0.732** | **100.0%** | **3,322.7 ms** | **Correct** |
| `western_honey_bee.jpg` | Insecta | *Apis mellifera* | Western Honey Bee (*Apis mellifera*) | **0.712** | **100.0%** | **3,404.1 ms** | **Correct** |
| `fly_agaric_mushroom.jpg` | Fungi | *Amanita muscaria* | Fly Agaric (*Amanita muscaria*) | **0.722** | **100.0%** | **3,246.4 ms** | **Correct** |
| `golden_chanterelle.jpg` | Fungi | *Cantharellus cibarius* | Golden Chanterelle (*Cantharellus cibarius*) | **0.730** | **100.0%** | **3,452.1 ms** | **Correct** |
| `turkey_tail_fungus.jpg` | Fungi | *Trametes versicolor* | Turkey Tail (*Trametes versicolor*) | **0.726** | **100.0%** | **3,348.8 ms** | **Correct** |
| `pearl_oyster_mushroom.jpg` | Fungi | *Pleurotus ostreatus* | Pearl Oyster Mushroom (*Pleurotus ostreatus*) | **0.735** | **100.0%** | **3,515.8 ms** | **Correct** |
| `eastern_chipmunk.jpg` | Mammalia | *Tamias striatus* | Eastern Chipmunk (*Tamias striatus*) | **0.739** | **100.0%** | **3,232.8 ms** | **Correct** |
| `painted_turtle.jpg` | Reptilia | *Chrysemys picta* | Painted Turtle (*Chrysemys picta*) | **0.738** | **100.0%** | **3,327.8 ms** | **Correct** |
| `tropical_foliage.jpg` | OOD | *Unrepresented in catalog* | Bloodroot (*Tentative NN*, 0.549) | **0.549** | **21.4%** | **3,388.5 ms** | **Inconclusive (OOD)** |
| `blurry_woodland_shadow.jpg` | Ambiguous | *Low-SNR shadow* | Painted Turtle (*Ambiguous NN*, 0.676) | **0.676** | **29.4%** | **3,241.2 ms** | **Uncertain** |

- **In-Distribution Top-1 Accuracy**: **100.0% (19 / 19)**
- **In-Distribution Top-3 Accuracy**: **100.0% (19 / 19)**
- **Out-of-Distribution Rejection Rate**: **100.0% (1 / 1)** (Tropical foliage rejected with status `inconclusive` below 0.60 threshold)
- **Ambiguity Calibration Rate**: **100.0% (1 / 1)** (Blurry shadow classified as `uncertain` with narrow lookalike margin)
- **Mean Warm Inference Latency (CPU)**: **3,371.1 ms**
- **Projected GPU Latency (CUDA fp16)**: **~60 - 95 ms**
- **Model Weight RAM Footprint**: **~1,822.7 MB RAM** (~2,043.4 MB peak RSS)
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

### Uncertainty Ratings & User UX:
1. **`confident`**: Emerald badge. High visual similarity ($\ge 0.65$), high softmax mass ($\ge 0.60$), and distinct margin ($\ge 0.25$) over alternatives.
2. **`moderate`**: Amber badge. Prompts the user: *"Possible match — examine distinguishing field marks outdoors."*
3. **`uncertain`**: Orange badge. Top candidate similarity is moderate or margin to lookalikes is narrow ($< 0.25$). Suggests comparing top alternatives.
4. **`inconclusive` / `Not in my database`**: Alert indicating the specimen is absent from the candidate catalog (cosine $< 0.60$), showing tentative nearest neighbors for educational reference only.

---

## 4. Lookalike Disambiguation

Nature is full of Batesian mimicry and convergent evolution. For example:
- **Monarch Butterfly (*Danaus plexippus*)** vs. **Viceroy (*Limenitis archippus*)**:
  - BioCLIP-2 correctly identifies Viceroy as Viceroy (*0.732*) with Monarch runner-up (*0.652*).
  - Identifies Monarch as Monarch (*0.703*) with Viceroy runner-up (*0.641*).
- **White Oak (*Quercus alba*)** vs. **Northern Red Oak (*Quercus rubra*)**:
  - BioCLIP-2 separates rounded lobes (*Quercus alba*, 0.729) from bristle-tipped pointed lobes (*Quercus rubra*, 0.693).

Rather than concealing alternative matches, WildLens AI surfaces candidate lookalikes and field verification tips (e.g., checking the black horizontal line across hindwing veins).

---

## 5. Model Limitations & Safety Guardrails

1. **Macro / Microscope Scale**: BioCLIP-2 was trained on field photographs. It is not calibrated for microscopic cellular or spore morphology.
2. **Juvenile vs. Adult Stages**: Nymphs, larvae, and seedlings may score lower similarity than mature specimens.
3. **Toxic Lookalikes & Foraging Safety**: The platform strictly prohibits using model output for foraging, edible mushroom harvesting, or medicinal usage. Mandatory safety disclaimers are returned with every inference response.

