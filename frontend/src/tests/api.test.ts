import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getApiBaseUrl,
  getApiUrl,
  fetchModelStatus,
  identifyImageFile,
  isBackendConfigured,
  setStoredApiUrl,
  getStoredApiUrl,
  WildLensApiError,
  testBackendConnection
} from '../lib/api';

describe('Frontend API Client Service', () => {
  const originalEnv = process.env;
  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    try {
      window.localStorage?.clear();
    } catch {}
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
    expect(isBackendConfigured()).toBe(true);
  });

  it('resolves public production API URL from NEXT_PUBLIC_BACKEND_URL fallback', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://backend.wildlens.ai';
    expect(getApiBaseUrl()).toBe('https://backend.wildlens.ai');
    expect(getApiUrl('api/missions')).toBe('https://backend.wildlens.ai/api/missions');
  });

  it('prioritizes user-configured localStorage URL over environment variables', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://env.wildlens.example.com';
    setStoredApiUrl('https://custom.wildlens.instance.org');

    expect(getStoredApiUrl()).toBe('https://custom.wildlens.instance.org');
    expect(getApiBaseUrl()).toBe('https://custom.wildlens.instance.org');
    expect(getApiUrl('api/identify')).toBe('https://custom.wildlens.instance.org/api/identify');

    setStoredApiUrl(null);
    expect(getApiBaseUrl()).toBe('https://env.wildlens.example.com');
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
    // Crucial fix: getApiUrl returns empty string in production to prevent POST to GitHub Pages
    expect(getApiUrl('api/identify')).toBe('');
    expect(isBackendConfigured()).toBe(false);
  });

  it('directly uses NEXT_PUBLIC_API_URL configured from env file without discarding it', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';

    Object.defineProperty(window, 'location', {
      value: { hostname: 'suguda-thakur-marndi.github.io' },
      writable: true,
      configurable: true,
    });

    expect(getApiBaseUrl()).toBe('http://localhost:8000');
    expect(getApiUrl('api/identify')).toBe('http://localhost:8000/api/identify');
    expect(isBackendConfigured()).toBe(true);
  });

  it('ignores NEXT_PUBLIC_API_URL if it points to GitHub Pages domain', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://suguda-thakur-marndi.github.io/WildLens-AI';

    Object.defineProperty(window, 'location', {
      value: { hostname: 'suguda-thakur-marndi.github.io' },
      writable: true,
      configurable: true,
    });

    expect(getApiBaseUrl()).toBe('');
    expect(getApiUrl('api/identify')).toBe('');
  });

  it('returns unavailable status without network errors when backend is not configured in production', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    Object.defineProperty(window, 'location', {
      value: { hostname: 'suguda-thakur-marndi.github.io' },
      writable: true,
      configurable: true,
    });

    const telemetry = await fetchModelStatus();
    expect(telemetry.status).toBe('unavailable');
    expect(telemetry.device).toContain('External FastAPI Backend Required');
    expect(telemetry.offline_capable).toBe(false);
  });

  it('returns structured WildLensApiError when backend is unconfigured in production', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;

    Object.defineProperty(window, 'location', {
      value: { hostname: 'suguda-thakur-marndi.github.io' },
      writable: true,
      configurable: true,
    });

    const unknownFile = new File(['dummy_content'], 'unknown_forest_leaf.jpg', { type: 'image/jpeg' });

    try {
      await identifyImageFile(unknownFile);
      expect.fail('Should have thrown WildLensApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(WildLensApiError);
      expect(err.errorType).toBe('unconfigured_backend');
      expect(err.userMessage).toContain('GitHub Pages');
      expect(err.canRetry).toBe(false);
    }
  });

  it('distinguishes HTTP 405 Method Not Allowed and explains static hosting cause', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.wildlens.example.com';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 405,
      statusText: 'Method Not Allowed',
      headers: new Headers(),
      text: async () => '<html>405 Not Allowed</html>',
      json: async () => ({ detail: 'Method Not Allowed' }),
    } as any);

    const unknownFile = new File(['dummy_bytes'], 'random_wild_plant.jpg', { type: 'image/jpeg' });

    try {
      await identifyImageFile(unknownFile);
      expect.fail('Should have thrown WildLensApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(WildLensApiError);
      expect(err.status).toBe(405);
      expect(err.errorType).toBe('static_host_405');
      expect(err.userMessage).toContain('HTTP 405 Method Not Allowed');
      expect(err.canRetry).toBe(false);
    }
  });

  it('distinguishes HTTP 502/503/504 cold starts with helpful retry guidance', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.wildlens.example.com';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers(),
      text: async () => 'Service Unavailable',
      json: async () => { throw new Error('Not JSON'); },
    } as any);

    const unknownFile = new File(['dummy_bytes'], 'random_wild_plant.jpg', { type: 'image/jpeg' });

    try {
      await identifyImageFile(unknownFile);
      expect.fail('Should have thrown WildLensApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(WildLensApiError);
      expect(err.status).toBe(503);
      expect(err.errorType).toBe('cold_start_or_server_error');
      expect(err.userMessage).toContain('cold starts');
      expect(err.canRetry).toBe(true);
    }
  });

  it('allows bundled preset test specimen identification even when backend is unconfigured', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    Object.defineProperty(window, 'location', {
      value: { hostname: 'suguda-thakur-marndi.github.io' },
      writable: true,
      configurable: true,
    });

    // Preset test specimen filename
    const presetFile = new File(['dummy'], 'sample_yellow_trout_lily.jpg', { type: 'image/jpeg' });

    const result = await identifyImageFile(presetFile);
    expect(result).toBeDefined();
    expect(result.top_candidate.common_name).toContain('Trout Lily');
    expect(result.is_offline).toBe(true);
  });

  it('testBackendConnection verifies status and latency', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'healthy', version: '1.0.0' }),
    } as any);

    const check = await testBackendConnection('https://api.wildlens.example.com');
    expect(check.ok).toBe(true);
    expect(check.status).toBe(200);
    expect(check.data.status).toBe('healthy');
  });
});
