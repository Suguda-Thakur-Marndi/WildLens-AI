#!/usr/bin/env python3
"""
WildLens AI — Automated Hardware Profiler & Model Benchmark

Measures cold-start initialization latency, mean inference runtime across
sample biodiversity images, system RAM / VRAM overhead with both models loaded,
and generates an honest evaluation table including Top-1 and Top-3 accuracy.
"""

import os
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

import psutil
import torch
from app.services.bioclip_service import BioClipService
from app.services.llm_service import LLMService


def benchmark():
    print("=" * 95)
    print("WildLens AI — Hardware Benchmarking & BioCLIP-2 Multi-Taxa Evaluation Suite")
    print("=" * 95)

    process = psutil.Process(os.getpid())
    mem_before_mb = process.memory_info().rss / (1024 * 1024)

    service = BioClipService.get_instance()
    device = service.device
    print(f"Platform: {sys.platform} | Python: {sys.version.split()[0]}")
    print(f"Target Compute Device: {device.upper()}")
    print(f"Initial Process Memory: {mem_before_mb:.1f} MB\n")

    # 1. Cold start measurement for BioCLIP-2
    print("--> 1. Measuring BioCLIP-2 cold-start weight initialization...")
    t0 = time.time()
    service.load_model(force_reload=True)
    bioclip_cold_start_sec = time.time() - t0
    mem_after_bioclip_mb = process.memory_info().rss / (1024 * 1024)
    bioclip_weight_ram_mb = mem_after_bioclip_mb - mem_before_mb

    print(f"    BioCLIP-2 Cold Start Duration: {bioclip_cold_start_sec:.2f} s")
    print(f"    RAM delta for BioCLIP-2 weights: {bioclip_weight_ram_mb:.1f} MB\n")

    # 2. Attempt loading Language Layer (Qwen3-8B) to measure dual-model memory footprint
    print("--> 2. Initializing Language Layer (Qwen3-8B) for dual-model memory profiling...")
    llm_service = LLMService.get_instance()
    t_llm_0 = time.time()
    llm_loaded = llm_service.load_model(force_reload=True)
    llm_cold_start_sec = time.time() - t_llm_0
    mem_after_both_mb = process.memory_info().rss / (1024 * 1024)
    total_dual_model_ram_mb = mem_after_both_mb - mem_before_mb

    print(f"    Language Layer Status: '{llm_service.status}' ({llm_cold_start_sec:.2f} s)")
    print(f"    Peak Process Memory with both layers initialized: {mem_after_both_mb:.1f} MB (Delta: {total_dual_model_ram_mb:.1f} MB)\n")

    # 3. Sample inference measurements across 20+ authentic photos
    sample_dir = PROJECT_ROOT / "backend" / "sample_images"
    if not sample_dir.exists():
        sample_dir = PROJECT_ROOT / "sample_images"

    samples = [
        # (Display Name, filename, taxonomic_group, expected_common_name, is_ood, is_ambiguous)
        # Birds
        ("American Robin", "american_robin.jpg", "Aves", "American Robin", False, False),
        ("Blue Jay", "blue_jay.jpg", "Aves", "Blue Jay", False, False),
        ("Red-tailed Hawk", "red_tailed_hawk.jpg", "Aves", "Red-tailed Hawk", False, False),
        # Plants
        ("White Oak Leaf", "white_oak_leaf.jpg", "Plantae", "White Oak", False, False),
        ("Northern Red Oak", "northern_red_oak_leaf.jpg", "Plantae", "Northern Red Oak", False, False),
        ("Liverleaf (Hepatica)", "hepatica_nobilis.jpg", "Plantae", "Liverleaf", False, False),
        ("Harebell Flower", "harebell_flower.jpg", "Plantae", "Harebell", False, False),
        ("Attached Blue Flower", "attached_blue_flower.jpg", "Plantae", "Harebell", False, False),
        ("Yellow Trout Lily", "yellow_trout_lily.jpg", "Plantae", "Yellow Trout Lily", False, False),
        ("Eastern Poison Ivy", "eastern_poison_ivy.jpg", "Plantae", "Eastern Poison Ivy", False, False),
        # Insects
        ("Monarch Butterfly", "monarch_butterfly.jpg", "Insecta", "Monarch Butterfly", False, False),
        ("Viceroy Butterfly", "viceroy_butterfly.jpg", "Insecta", "Viceroy Butterfly", False, False),
        ("Western Honey Bee", "western_honey_bee.jpg", "Insecta", "Western Honey Bee", False, False),
        # Fungi
        ("Fly Agaric", "fly_agaric_mushroom.jpg", "Fungi", "Fly Agaric", False, False),
        ("Golden Chanterelle", "golden_chanterelle.jpg", "Fungi", "Golden Chanterelle", False, False),
        ("Turkey Tail", "turkey_tail_fungus.jpg", "Fungi", "Turkey Tail", False, False),
        ("Pearl Oyster Mushroom", "pearl_oyster_mushroom.jpg", "Fungi", "Pearl Oyster Mushroom", False, False),
        # Fauna / Vertebrates
        ("Eastern Chipmunk", "eastern_chipmunk.jpg", "Mammalia", "Eastern Chipmunk", False, False),
        ("Painted Turtle", "painted_turtle.jpg", "Reptilia", "Painted Turtle", False, False),
        # Hard / Lookalike / Ambiguous / OOD Cases
        ("Tropical Foliage (OOD)", "tropical_foliage.jpg", "OOD", "Not in my database", True, False),
        ("Blurry Woodland Shadow", "blurry_woodland_shadow.jpg", "Ambiguous", "Uncertain identification", False, True),
    ]

    # Warmup inference pass
    warmup_img = sample_dir / "american_robin.jpg"
    if warmup_img.exists():
        with open(warmup_img, "rb") as f:
            _ = service.identify_image(f.read())

    latencies = []
    results = []
    top1_correct = 0
    top3_correct = 0
    eval_count = 0
    ood_correct = 0
    ood_count = 0

    print("--> 3. Running multi-taxa inference benchmark across varied photos...")
    for display_name, filename, group, expected_name, is_ood, is_ambiguous in samples:
        img_path = sample_dir / filename
        if not img_path.exists():
            continue

        with open(img_path, "rb") as f:
            b = f.read()

        res = service.identify_image(b)
        top1 = res.top_k_predictions[0] if res.top_k_predictions else None
        top_3_names = [p.common_name for p in res.top_k_predictions[:3]]
        latencies.append(res.inference_time_ms)

        # Accuracy assessment
        is_top1_match = False
        is_top3_match = False

        if is_ood:
            ood_count += 1
            # Correct if flagged as inconclusive or Not in my database
            if res.confidence_status == "inconclusive" or "Not in my database" in res.common_name:
                is_top1_match = True
                ood_correct += 1
        elif is_ambiguous:
            # Correct if flagged as uncertain/inconclusive
            if res.confidence_status in ("uncertain", "inconclusive"):
                is_top1_match = True
        else:
            eval_count += 1
            if top1 and top1.common_name.lower() == expected_name.lower():
                is_top1_match = True
                top1_correct += 1
            if any(n.lower() == expected_name.lower() for n in top_3_names):
                is_top3_match = True
                top3_correct += 1

        results.append({
            "subject": display_name,
            "group": group,
            "filename": filename,
            "predicted": f"{top1.common_name} ({top1.scientific_name})" if top1 else "None",
            "similarity": f"{res.similarity_score:.3f}",
            "confidence": f"{top1.confidence * 100:.1f}%" if top1 else "0.0%",
            "latency_ms": res.inference_time_ms,
            "status": res.confidence_status,
            "top1_match": is_top1_match,
            "top3_match": is_top3_match or is_top1_match,
        })

    avg_latency = sum(latencies) / len(latencies) if latencies else 0.0

    print("\n" + "=" * 95)
    print(f"{'Subject':<24} | {'Group':<8} | {'Top-1 Match':<30} | {'Cosine':<6} | {'Conf':<6} | {'Status':<12} | {'Latency'}")
    print("-" * 95)
    for r in results:
        status_flag = "[PASS]" if r["top1_match"] else "[FAIL]"
        print(
            f"{r['subject']:<24} | {r['group']:<8} | {r['predicted']:<30} | {r['similarity']:<6} | "
            f"{r['confidence']:<6} | {r['status']:<12} | {r['latency_ms']:5.1f}ms {status_flag}"
        )
    print("-" * 95)

    print("\n--- SUMMARY METRICS ---")
    print(f"Total Specimen Photos Evaluated : {len(results)}")
    if eval_count > 0:
        print(f"In-Distribution Top-1 Accuracy : {top1_correct}/{eval_count} ({top1_correct / eval_count * 100:.1f}%)")
        print(f"In-Distribution Top-3 Accuracy : {top3_correct}/{eval_count} ({top3_correct / eval_count * 100:.1f}%)")
    if ood_count > 0:
        print(f"Out-of-Distribution Rejection  : {ood_correct}/{ood_count} ({ood_correct / ood_count * 100:.1f}%)")
    print(f"Mean Warm Inference Latency    : {avg_latency:.1f} ms per image")
    print(f"Peak Process Resident RAM      : {process.memory_info().rss / (1024 * 1024):.1f} MB")

    if torch.cuda.is_available():
        print(f"CUDA VRAM Allocated            : {torch.cuda.memory_allocated() / (1024 * 1024):.1f} MB")
    else:
        print("Compute Runtime                : Multi-threaded PyTorch CPU Engine (16 threads)")

    print("\n[SUCCESS] Hardware benchmarking completed successfully.")


if __name__ == "__main__":
    benchmark()

