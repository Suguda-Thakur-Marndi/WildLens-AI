import sys
from pathlib import Path
import torch
from PIL import Image

sys.path.insert(0, 'backend')
from app.services.bioclip_service import BioClipService

service = BioClipService.get_instance()
service.load_model()

scale = service.model.logit_scale.exp().item()
print(f"Model logit_scale raw: {service.model.logit_scale.item():.4f}, exp (temperature factor): {scale:.4f}")

for img_name in ['hepatica_nobilis.jpg', 'hepatica_nobilis.avif', 'attached_blue_flower.jpg', 'harebell_flower.jpg', 'tropical_foliage.jpg']:
    p = Path('backend/sample_images') / img_name
    if not p.exists():
        continue
    img = Image.open(p).convert('RGB')
    t = service.preprocess(img).unsqueeze(0).to(service.device)
    with torch.no_grad():
        feat = service.model.encode_image(t)
        feat /= feat.norm(dim=-1, keepdim=True)
        cos = (feat @ service.text_features.T)[0].cpu().numpy()
        logits = scale * cos
        probs = torch.tensor(logits).softmax(dim=-1).numpy()
    
    ranked = sorted(range(len(cos)), key=lambda i: cos[i], reverse=True)
    print(f"\n=== {img_name} ===")
    for rank, idx in enumerate(ranked[:5]):
        entry = service.candidate_taxa[idx]
        c_name = entry["common_name"]
        s_name = entry["scientific_name"]
        print(f"  {rank+1}. {c_name:25} ({s_name:25}) | Cosine: {cos[idx]:.4f} | Logit: {logits[idx]:.2f} | Softmax: {probs[idx]*100:.2f}%")
