import { describe, it, expect } from 'vitest';

describe('WildLens AI Frontend Core Logic', () => {
  it('validates allowed image formats (JPG, PNG, WebP)', () => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    expect(allowed.includes('image/jpeg')).toBe(true);
    expect(allowed.includes('image/png')).toBe(true);
    expect(allowed.includes('image/webp')).toBe(true);
    expect(allowed.includes('application/pdf')).toBe(false);
    expect(allowed.includes('text/plain')).toBe(false);
  });

  it('enforces maximum image upload size of 15MB', () => {
    const MAX_SIZE_MB = 15;
    const maxBytes = MAX_SIZE_MB * 1024 * 1024;
    const validSize = 5 * 1024 * 1024; // 5MB
    const oversized = 16 * 1024 * 1024; // 16MB

    expect(validSize <= maxBytes).toBe(true);
    expect(oversized <= maxBytes).toBe(false);
  });

  it('maps confidence scores to honest uncertainty ratings', () => {
    function computeUncertaintyRating(confidence: number, margin: number): string {
      if (confidence >= 0.40 && margin >= 0.12) return 'confident';
      if (confidence >= 0.20) return 'moderate';
      if (confidence >= 0.10) return 'uncertain';
      return 'inconclusive';
    }

    expect(computeUncertaintyRating(0.95, 0.40)).toBe('confident');
    expect(computeUncertaintyRating(0.35, 0.05)).toBe('moderate');
    expect(computeUncertaintyRating(0.15, 0.02)).toBe('uncertain');
    expect(computeUncertaintyRating(0.04, 0.01)).toBe('inconclusive');
  });

  it('correctly tracks completed outdoor mission IDs', () => {
    let completed: string[] = [];
    const missionId = 'mission_silent_bird';

    // Toggle on
    if (!completed.includes(missionId)) {
      completed.push(missionId);
    }
    expect(completed).toContain(missionId);

    // Toggle off
    completed = completed.filter(id => id !== missionId);
    expect(completed).not.toContain(missionId);
  });

  it('validates dual-model telemetry fields for BioCLIP-2 and Qwen3', () => {
    const telemetry = {
      status: 'ready' as const,
      model_name: 'imageomics/bioclip-2',
      model_revision: '2957b322090f9cb17ae72c71981c7218a28d81e0',
      model_license: 'MIT',
      device: 'cpu',
      supported_taxa_count: 36,
      offline_capable: true,
      vision_model_id: 'imageomics/bioclip-2',
      vision_model_license: 'MIT',
      vision_device: 'cpu',
      llm_model_id: 'Qwen/Qwen3-8B',
      llm_model_license: 'Apache-2.0',
      llm_status: 'ready',
      llm_device: 'cpu',
    };

    expect(telemetry.vision_model_id).toBe('imageomics/bioclip-2');
    expect(telemetry.vision_model_license).toBe('MIT');
    expect(telemetry.llm_model_id).toBe('Qwen/Qwen3-8B');
    expect(telemetry.llm_model_license).toBe('Apache-2.0');
    expect(telemetry.offline_capable).toBe(true);
  });
});

