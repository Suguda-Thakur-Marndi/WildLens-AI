import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkServiceConnectivity } from '../lib/connectivity';
import { journalDb } from '../lib/journalDb';
import { taxonomyCache } from '../lib/taxonomyCache';
import {
  explainWithGemini,
  askGeminiNaturalist,
  WildLensApiError,
  setStoredApiUrl,
} from '../lib/api';
import { Observation } from '../types';

describe('WildLens AI Hybrid Online & Offline Architecture', () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    vi.restoreAllMocks();
    setStoredApiUrl(null);
    try {
      localStorage.clear();
    } catch {}
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  describe('1. Honest Connection & Multi-State Diagnostics', () => {
    it('accurately identifies Local AI Ready when localhost backend is running BioCLIP-2', async () => {
      setStoredApiUrl('http://127.0.0.1:8000');

      // Mock backend health & gemini endpoints
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('/api/health')) {
          return new Response(
            JSON.stringify({
              status: 'healthy',
              model_status: 'ready',
              catalog_taxa_count: 36,
              gemini_status: 'ready',
              gemini_configured: true,
            }),
            { status: 200 }
          );
        }
        if (url.toString().includes('/api/gemini/status')) {
          return new Response(
            JSON.stringify({
              status: 'ready',
              model: 'gemini-2.5-flash',
              configured: true,
              online: true,
            }),
            { status: 200 }
          );
        }
        return new Response('Not found', { status: 404 });
      });

      const state = await checkServiceConnectivity();
      expect(state.backendConnected).toBe(true);
      expect(state.isLocalBackend).toBe(true);
      expect(state.bioclipStatus).toBe('ready');
      expect(state.badgeText).toBe('Local AI Ready');
      expect(state.canPerformOfflineInference).toBe(true);
      expect(state.offlineExplanation).toContain('Offline optical inference supported');
    });

    it('honestly distinguishes Remote AI Online when backend is hosted remotely', async () => {
      setStoredApiUrl('https://api.remote-wildlens.org');

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        if (url.toString().includes('/api/health')) {
          return new Response(
            JSON.stringify({
              status: 'healthy',
              model_status: 'ready',
              catalog_taxa_count: 36,
              gemini_status: 'ready',
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ status: 'ready', configured: true }), { status: 200 });
      });

      const state = await checkServiceConnectivity();
      expect(state.backendConnected).toBe(true);
      expect(state.isLocalBackend).toBe(false);
      expect(state.badgeText).toBe('Remote AI Online');
      // Crucial requirement: remote inference cannot claim offline AI readiness
      expect(state.canPerformOfflineInference).toBe(false);
      expect(state.offlineExplanation).toContain('Inference requires remote server');
    });

    it('reports Offline Mode when device has no network connectivity and no local backend', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline / connection refused'));

      const state = await checkServiceConnectivity();
      expect(state.isOnline).toBe(false);
      expect(state.badgeText).toBe('Offline Mode');
      expect(state.canPerformOfflineInference).toBe(false);
      expect(state.statusDescription).toContain('Field Journal entries, cached taxonomy');
    });

    it('reports Service Unavailable when internet is connected but backend is down', async () => {
      setStoredApiUrl('http://127.0.0.1:8000');

      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

      const state = await checkServiceConnectivity();
      expect(state.isOnline).toBe(true);
      expect(state.backendConnected).toBe(false);
      expect(state.badgeText).toBe('Service Unavailable');
      expect(state.canPerformOfflineInference).toBe(false);
    });

    it('reports Loading AI Model when backend is connected but weights are loading', async () => {
      setStoredApiUrl('http://127.0.0.1:8000');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'healthy',
            model_status: 'loading',
          }),
          { status: 200 }
        )
      );

      const state = await checkServiceConnectivity();
      expect(state.backendConnected).toBe(true);
      expect(state.bioclipStatus).toBe('loading');
      expect(state.badgeText).toBe('Loading AI Model...');
    });
  });

  describe('2. Gemini Naturalist Cloud Service & Offline Disabling', () => {
    it('disables Gemini natural history explanations while offline and explains why', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      await expect(
        explainWithGemini({
          specimen_name: 'Yellow Trout Lily',
          scientific_name: 'Erythronium americanum',
        })
      ).rejects.toThrow(WildLensApiError);

      try {
        await explainWithGemini({
          specimen_name: 'Yellow Trout Lily',
          scientific_name: 'Erythronium americanum',
        });
      } catch (err: any) {
        expect(err.userMessage).toContain('Gemini Naturalist requires an active internet connection');
        expect(err.userMessage).toContain('local taxonomy database remain available');
      }
    });

    it('disables Gemini Q&A while offline and explains why', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      await expect(
        askGeminiNaturalist({
          question: 'Does this flower attract native bees?',
          specimen_name: 'Yellow Trout Lily',
        })
      ).rejects.toThrow(WildLensApiError);
    });

    it('handles backend 503 missing API key with clear instructions without leaking secrets', async () => {
      setStoredApiUrl('http://127.0.0.1:8000');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: 'GEMINI_API_KEY environment variable is not configured on the backend server.',
          }),
          { status: 503 }
        )
      );

      try {
        await explainWithGemini({
          specimen_name: 'Eastern White Oak',
          scientific_name: 'Quercus alba',
        });
        expect.unreachable('Should have thrown WildLensApiError');
      } catch (err: any) {
        expect(err.status).toBe(503);
        expect(err.userMessage).toContain('GEMINI_API_KEY');
        expect(err.userMessage).toContain('backend .env');
      }
    });

    it('gracefully handles 429 rate limits without silent fake responses', async () => {
      setStoredApiUrl('http://127.0.0.1:8000');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: 'Gemini API rate limit or quota exceeded. Please wait a moment before trying again.',
          }),
          { status: 429 }
        )
      );

      try {
        await explainWithGemini({
          specimen_name: 'Monarch Butterfly',
          scientific_name: 'Danaus plexippus',
        });
        expect.unreachable('Should have thrown WildLensApiError');
      } catch (err: any) {
        expect(err.status).toBe(429);
        expect(err.userMessage).toContain('rate limit');
        expect(err.canRetry).toBe(true);
      }
    });

    it('gracefully handles 502 invalid or revoked API credentials', async () => {
      setStoredApiUrl('http://127.0.0.1:8000');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: 'Gemini API authentication failed: API key is invalid, revoked, or expired.',
          }),
          { status: 502 }
        )
      );

      try {
        await askGeminiNaturalist({
          question: 'What is the host plant for monarchs?',
        });
        expect.unreachable('Should have thrown WildLensApiError');
      } catch (err: any) {
        expect(err.status).toBe(502);
        expect(err.userMessage).toContain('authentication failed');
        expect(err.userMessage).toContain('invalid, revoked, or expired');
      }
    });

    it('gracefully handles 504 gateway timeout', async () => {
      setStoredApiUrl('http://127.0.0.1:8000');

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: 'Gemini API request timed out after 15.0 seconds.',
          }),
          { status: 504 }
        )
      );

      try {
        await explainWithGemini({
          specimen_name: 'Monarch Butterfly',
          scientific_name: 'Danaus plexippus',
        });
        expect.unreachable('Should have thrown WildLensApiError');
      } catch (err: any) {
        expect(err.status).toBe(504);
        expect(err.userMessage).toContain('timed out');
      }
    });
  });

  describe('3. Offline Field Journal Persistence & Conflict-Free Sync', () => {
    it('persists new field observation with auto-assigned last_modified timestamp', async () => {
      const nowBefore = Date.now();
      const testObs: Observation = {
        id: `obs-test-${Date.now()}`,
        common_name: 'Eastern White Oak',
        scientific_name: 'Quercus alba',
        family: 'Fagaceae',
        photo_url: '',
        date: 'Today',
        timestamp: Date.now(),
        location: 'Ridge Trail',
        certainty: 96,
        status: 'User verified',
      };

      const added = await journalDb.add(testObs);
      expect(added.last_modified).toBeGreaterThanOrEqual(nowBefore);

      const retrieved = await journalDb.getById(testObs.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.common_name).toBe('Eastern White Oak');
    });

    it('queues observation changes when offline without data loss', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const offlineObs: Observation = {
        id: 'obs-offline-test',
        common_name: 'Monarch Butterfly',
        scientific_name: 'Danaus plexippus',
        family: 'Nymphalidae',
        photo_url: '',
        date: 'Today',
        timestamp: Date.now(),
        location: 'Sunny Meadow',
        certainty: 98,
        status: 'User verified',
      };

      await journalDb.add(offlineObs);
      const syncResult = await journalDb.syncWithServer();

      expect(syncResult.status).toBe('offline_queued');
      expect(syncResult.message).toContain('safely stored offline in local IndexedDB');

      // Verify the observation remains preserved in local journal
      const all = await journalDb.getAll();
      expect(all.some((o) => o.id === 'obs-offline-test')).toBe(true);
    });

    it('performs conflict-free sync using last_modified and does not overwrite newer local edits', async () => {
      setStoredApiUrl('http://127.0.0.1:8000');

      const olderServerTime = Date.now() - 50000;
      const newerLocalTime = Date.now();

      // Create a local edit with newer last_modified
      const editedLocalObs: Observation = {
        id: 'obs-conflict-1',
        common_name: 'American Robin',
        scientific_name: 'Turdus migratorius',
        family: 'Turdidae',
        photo_url: '',
        date: 'Today',
        timestamp: Date.now(),
        last_modified: newerLocalTime,
        location: 'Local Backyard - Edited Locally',
        certainty: 99,
        status: 'User verified',
        notes: 'Local newer note',
      };
      await journalDb.add(editedLocalObs);

      // Server returns an older version
      const olderServerObs: Observation = {
        ...editedLocalObs,
        last_modified: olderServerTime,
        notes: 'Older server note',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            status: 'success',
            synced_count: 1,
            server_observations: [olderServerObs],
            message: 'Sync complete',
          }),
          { status: 200 }
        )
      );

      await journalDb.syncWithServer();

      // Verify local newer note was NOT overwritten by older server note
      const localAfter = await journalDb.getById('obs-conflict-1');
      expect(localAfter?.notes).toBe('Local newer note');
    });
  });

  describe('4. Offline Taxonomy Catalog Availability', () => {
    it('provides complete curated taxa catalog offline without network access', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const taxa = await taxonomyCache.getSpecies();
      expect(taxa.length).toBeGreaterThan(0);

      // Verify core diagnostic traits exist offline
      const troutLily = taxa.find((t) => t.scientific_name === 'Erythronium americanum');
      expect(troutLily).toBeDefined();
      expect(troutLily?.diagnostic_traits).toBeDefined();
      expect(troutLily?.diagnostic_traits?.length).toBeGreaterThan(0);
    });

    it('searches species offline by common name and family', async () => {
      const results = await taxonomyCache.search('oak');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((s) => s.common_name.includes('Oak'))).toBe(true);

      const byFamily = await taxonomyCache.search('Ranunculaceae');
      expect(byFamily.some((s) => s.scientific_name === 'Actaea pachypoda')).toBe(true);
    });
  });
});
