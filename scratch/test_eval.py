import os
import sys
from pathlib import Path
from PIL import Image
import torch
import open_clip

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

from app.repositories.taxonomy_repository import default_taxonomy_repository

model, _, preprocess = open_clip.create_model_and_transforms('hf-hub:imageomics/bioclip-2', cache_dir='models/bioclip_cache')
tokenizer = open_clip.get_tokenizer('hf-hub:imageomics/bioclip-2', cache_dir='models/bioclip_cache')
model.eval()

taxa = default_taxonomy_repository.list_all()
templates = default_taxonomy_repository.generate_lineage_templates()
t1 = [t[0] for t in templates]
t2 = [t[1] for t in templates]

with torch.inference_mode():
    f1 = model.encode_text(tokenizer(t1))
    f1 = f1 / f1.norm(dim=-1, keepdim=True)
    f2 = model.encode_text(tokenizer(t2))
    f2 = f2 / f2.norm(dim=-1, keepdim=True)
    text_feats = (f1 + f2) / 2.0
    text_feats = text_feats / text_feats.norm(dim=-1, keepdim=True)

sample_dir = PROJECT_ROOT / "backend" / "sample_images"
scale = model.logit_scale.exp().item() if hasattr(model, "logit_scale") else 100.0

print(f"Logit scale: {scale:.2f}")
for img_path in sorted(sample_dir.iterdir()):
    if not img_path.suffix.lower() in ('.jpg', '.png', '.avif', '.webp'):
        continue
    try:
        img = Image.open(img_path).convert('RGB')
    except Exception as e:
        continue
    img_tensor = preprocess(img).unsqueeze(0)
    with torch.inference_mode():
        img_feats = model.encode_image(img_tensor)
        img_feats = img_feats / img_feats.norm(dim=-1, keepdim=True)
        cos = (img_feats @ text_feats.T).squeeze(0)
        probs = (scale * cos).softmax(dim=-1)

    top_idx = cos.argsort(descending=True)
    i0 = top_idx[0].item()
    i1 = top_idx[1].item()
    sim0 = cos[i0].item()
    sim1 = cos[i1].item()
    p0 = probs[i0].item()
    p1 = probs[i1].item()
    margin = p0 - p1

    print(f"{img_path.name:<25} -> Top 1: {taxa[i0]['common_name']} (sim={sim0:.4f}, p={p0:.4f}, margin={margin:.4f}) | Top 2: {taxa[i1]['common_name']} (sim={sim1:.4f})")
