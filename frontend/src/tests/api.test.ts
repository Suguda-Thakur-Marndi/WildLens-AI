import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiBaseUrl, getApiUrl, fetchModelStatus, identifyImageFile } from '../lib/api';

describe('Frontend API Client Service', () => {
  const originalEnv = process.env;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('resolves public production API URL from NEXT_PUBLIC_API_URL', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.wildlens.example.com/';
    expect(getApiBaseUrl()).toBe('https://api.wildlens.example.com');
    expect(getApiUrl('api/identify')).toBe('https://api.wildlens.example.com/api/identify');
    expect(getApiUrl('/api/model/status')).toBe('https://api.wildlens.example.com/api/model/status');
  });

  it('resolves public production API URL from NEXT_PUBLIC_BACKEND_URL fallback', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://backend.wildlens.ai';
    expect(getApiBaseUrl()).toBe('https://backend.wildlens.ai');
    expect(getApiUrl('api/missions')).toBe('https://backend.wildlens.ai/api/missions');
  });

  it('does not route to localhost in production when NEXT_PUBLIC_API_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    delete process.env.BACKEND_URL;

    // Simulate production browser hostname
    Object.defineProperty(window, 'location', {
      value: { hostname: 'suguda-thakur-marndi.github.io' },
      writable: true,
      configurable: true,
    });

    expect(getApiBaseUrl()).toBe('');
    expect(getApiUrl('api/model/status')).toBe('/api/model/status');
  });

  it('returns unavailable status instead of claiming browser WebGPU engine when backend is offline', async () => {
    // Force fetch to reject simulating offline/disconnected backend
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'));

    const telemetry = await fetchModelStatus();
    expect(telemetry.status).toBe('unavailable');
    expect(telemetry.offline_capable).toBe(false);
    expect(telemetry.device).not.toContain('WebGPU');
    expect(telemetry.model_name).toContain('Backend Disconnected');
  });

  it('rejects unknown images with honest error message when backend is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    // Unknown image file
    const unknownFile = new File(['dummy_content'], 'unknown_forest_leaf.jpg', { type: 'image/jpeg' });

    await expect(identifyImageFile(unknownFile)).rejects.toThrow(/unreachable|not configured/);
  });
});
