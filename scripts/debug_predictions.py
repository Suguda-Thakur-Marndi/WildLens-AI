#!/usr/bin/env python3
"""
Debug Predictions Script for WildLens AI BioCLIP Pipeline.
Evaluates top-5 predictions, probabilities, and raw cosine similarities
for all images in backend/sample_images/ and backend/debug_images/.
Reports Top-1 and Top-3 accuracy against known ground truth labels.
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Add backend to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

# Ground truth mapping from filename patterns to scientific / common names
GROUND_TRUTH_MAPPING: Dict[str, Dict[str, str]] = {
    "american_robin": {"common_name": "American Robin", "scientific_name": "Turdus migratorius"},
    "attached_blue_flower": {"common_name": "Harebell", "scientific_name": "Campanula rotundifolia"},
    "harebell": {"common_name": "Harebell", "scientific_name": "Campanula rotundifolia"},
    "harebell_flower": {"common_name": "Harebell", "scientific_name": "Campanula rotundifolia"},
    "hepatica_nobilis": {"common_name": "Liverleaf", "scientific_name": "Hepatica nobilis"},
    "monarch_butterfly": {"common_name": "Monarch Butterfly", "scientific_name": "Danaus plexippus"},
    "white_oak_leaf": {"common_name": "White Oak", "scientific_name": "Quercus alba"},
    "tropical_foliage": {"common_name": "Not in my database", "scientific_name": "Not in my database"},
}


def get_ground_truth(filename: str) -> Optional[Dict[str, str]]:
    stem = Path(filename).stem.lower()
    for key, val in GROUND_TRUTH_MAPPING.items():
        if key in stem:
            return val
    return None


def run_evaluation() -> None:
    from app.services.bioclip_service import BioClipService

    service = BioClipService.get_instance()
    print("Loading BioCLIP model...")
    service.load_model()
    print(f"Model ready on device: {service.device}\n")

    image_dirs = [
        PROJECT_ROOT / "backend" / "sample_images",
        PROJECT_ROOT / "backend" / "debug_images",
    ]

    image_files: List[Path] = []
    for d in image_dirs:
        if d.exists():
            for f in sorted(d.iterdir()):
                if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
                    image_files.append(f)

    if not image_files:
        print("No test images found in backend/sample_images or backend/debug_images.")
        return

    print(f"Found {len(image_files)} test images across sample/debug directories.\n")
    print("=" * 80)

    total_evaluable = 0
    top1_correct = 0
    top3_correct = 0

    results_table = []

    for img_path in image_files:
        gt = get_ground_truth(img_path.name)
        with open(img_path, "rb") as f:
            img_bytes = f.read()

        res = service.identify_image(img_bytes)

        print(f"Image: {img_path.name}")
        gt_label = f"{gt['common_name']} ({gt['scientific_name']})" if gt else "Unknown / Unlabeled"
        print(f"Ground Truth : {gt_label}")
        print(f"Primary Pred : {res.common_name} ({res.scientific_name})")
        print(f"Status       : {res.confidence_status} (Rating: {res.uncertainty_rating})")
        print(f"Max Cosine   : {res.similarity_score:.4f}")
        print("Top-5 Candidates:")

        preds = res.top_k_predictions[:5]
        for idx, p in enumerate(preds, 1):
            print(f"  {idx}. {p.common_name:<24} ({p.scientific_name:<28}) | "
                  f"Softmax: {p.confidence * 100:6.2f}% | Cosine: {p.similarity_score:.4f}")

        is_ood = gt and gt["common_name"] == "Not in my database"
        top1_match = False
        top3_match = False

        if gt and not is_ood:
            total_evaluable += 1
            expected_sci = gt["scientific_name"].lower()
            expected_com = gt["common_name"].lower()

            # Check top 1
            if len(preds) > 0:
                p1 = preds[0]
                if (p1.scientific_name.lower() == expected_sci or
                    expected_sci in p1.scientific_name.lower() or
                    p1.common_name.lower() == expected_com or
                    expected_com in p1.common_name.lower()):
                    top1_match = True

            # Check top 3
            for p in preds[:3]:
                if (p.scientific_name.lower() == expected_sci or
                    expected_sci in p.scientific_name.lower() or
                    p.common_name.lower() == expected_com or
                    expected_com in p.common_name.lower()):
                    top3_match = True
                    break

            if top1_match:
                top1_correct += 1
            if top3_match:
                top3_correct += 1

            print(f"Evaluation   : Top-1 {'[CORRECT]' if top1_match else '[WRONG]'} | "
                  f"Top-3 {'[CORRECT]' if top3_match else '[WRONG]'}")
        elif is_ood:
            print("Evaluation   : [OOD Specimen - Evaluated for Inconclusive/Not in Database rejection]")

        print("-" * 80)

    print("\n" + "=" * 80)
    print("SUMMARY ACCURACY REPORT")
    print("=" * 80)
    if total_evaluable > 0:
        top1_acc = (top1_correct / total_evaluable) * 100
        top3_acc = (top3_correct / total_evaluable) * 100
        print(f"Total Evaluable In-Catalog Images: {total_evaluable}")
        print(f"Top-1 Correct: {top1_correct}/{total_evaluable} ({top1_acc:.1f}%)")
        print(f"Top-3 Correct: {top3_correct}/{total_evaluable} ({top3_acc:.1f}%)")
    else:
        print("No evaluable in-catalog ground truth images found.")
    print("=" * 80)


if __name__ == "__main__":
    run_evaluation()
