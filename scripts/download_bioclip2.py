import os
import sys
import time
from pathlib import Path
from huggingface_hub import hf_hub_download

cache_dir = Path("models/bioclip_2_cache").resolve()
cache_dir.mkdir(parents=True, exist_ok=True)
print(f"Target cache directory: {cache_dir}")

repo_id = "imageomics/bioclip-2"
files_to_download = [
    "open_clip_config.json",
    "open_clip_model.safetensors"
]

for filename in files_to_download:
    print(f"Downloading {filename} from {repo_id}...")
    start = time.time()
    path = hf_hub_download(
        repo_id=repo_id,
        filename=filename,
        cache_dir=str(cache_dir),
    )
    elapsed = time.time() - start
    size_mb = os.path.getsize(path) / (1024 * 1024)
    print(f"Successfully downloaded {filename} ({size_mb:.1f} MB) in {elapsed:.1f}s to {path}")

print("All required BioCLIP-2 assets downloaded!")
