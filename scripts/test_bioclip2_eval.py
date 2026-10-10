import sys
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

import open_clip
import torch
from PIL import Image
from app.services.taxonomy_kb import TAXONOMY_DATABASE

cache_dir = PROJECT_ROOT / "models" / "bioclip_2_cache"
print("Loading BioCLIP-2...")
model, _, preprocess_val = open_clip.create_model_and_transforms("hf-hub:imageomics/bioclip-2", cache_dir=str(cache_dir))
tokenizer = open_clip.get_tokenizer("hf-hub:imageomics/bioclip-2")
model.eval()

# Generate 7-rank TreeOfLife lineage prompts
prompts_t1 = []
prompts_t2 = []
for entry in TAXONOMY_DATABASE:
    t = entry["taxonomy"]
    ranks = [
        t.get("kingdom", ""),
        t.get("phylum", ""),
        t.get("class", ""),
        t.get("order", ""),
        t.get("family", ""),
        t.get("genus", ""),
        t.get("species", "")
    ]
    lineage = " ".join(r for r in ranks if r)
    p1 = f"a photo of {lineage}"
    p2 = f"a photo of {entry['common_name']}, {lineage}"
    prompts_t1.append(p1)
    prompts_t2.append(p2)

with torch.no_grad():
    t1 = tokenizer(prompts_t1)
    t2 = tokenizer(prompts_t2)
    f1 = model.encode_text(t1)
    f1 /= f1.norm(dim=-1, keepdim=True)
    f2 = model.encode_text(t2)
    f2 /= f2.norm(dim=-1, keepdim=True)
    text_features = (f1 + f2) / 2.0
    text_features /= text_features.norm(dim=-1, keepdim=True)

test_imgs = [
    ("Attached Blue Flower", PROJECT_ROOT / "backend" / "sample_images" / "attached_blue_flower.jpg"),
    ("American Robin", PROJECT_ROOT / "backend" / "sample_images" / "american_robin.jpg"),
    ("Monarch Butterfly", PROJECT_ROOT / "backend" / "sample_images" / "monarch_butterfly.jpg"),
    ("White Oak Leaf", PROJECT_ROOT / "backend" / "sample_images" / "white_oak_leaf.jpg"),
    ("Harebell Flower", PROJECT_ROOT / "backend" / "sample_images" / "harebell_flower.jpg"),
    ("Liverleaf (Hepatica)", PROJECT_ROOT / "backend" / "sample_images" / "hepatica_nobilis.jpg"),
    ("Tropical Foliage (OOD)", PROJECT_ROOT / "backend" / "sample_images" / "tropical_foliage.jpg")
]

for label, path in test_imgs:
    if not path.exists():
        continue
    img = Image.open(path).convert("RGB")
    tensor = preprocess_val(img).unsqueeze(0)
    with torch.no_grad():
        img_feat = model.encode_image(tensor)
        img_feat /= img_feat.norm(dim=-1, keepdim=True)
        cos = (img_feat @ text_features.T)[0]
        scale = model.logit_scale.exp().item() if hasattr(model, "logit_scale") else 100.0
        probs = (scale * img_feat @ text_features.T).softmax(dim=-1)[0]
    
    top5_idx = cos.argsort(descending=True)[:5]
    print(f"\n=== {label} ===")
    for rank, idx in enumerate(top5_idx, 1):
        name = TAXONOMY_DATABASE[idx]["common_name"]
        sci = TAXONOMY_DATABASE[idx]["scientific_name"]
        print(f"  {rank}. {name:25} ({sci:25}) | Cosine: {cos[idx].item():.4f} | Prob: {probs[idx].item()*100:6.2f}%")
