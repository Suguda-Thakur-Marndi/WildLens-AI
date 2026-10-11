'use client';

import { Observation, JournalSyncResponse } from '@/src/types';
import { SAMPLE_OBSERVATIONS } from './sampleData';
import { getApiUrl } from './api';

const DB_NAME = 'wildlens_field_guide_db';
const DB_VERSION = 1;
const STORE_NAME = 'observations';
const SYNC_QUEUE_KEY = 'wildlens_pending_sync_queue';
const LAST_SYNCED_KEY = 'wildlens_last_synced_at';

class JournalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private syncInProgress = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        // Auto-synchronize pending changes when connectivity returns
        this.syncWithServer().catch((err) =>
          console.warn('[WildLens Journal] Auto-sync upon online event skipped:', err)
        );
      });
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available on server'));
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.warn('IndexedDB failed to open, falling back to local memory');
          reject(request.error);
        };

        request.onsuccess = () => {
          const db = request.result;
          this.seedInitialDataIfEmpty(db).then(() => resolve(db));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('family', 'family', { unique: false });
            store.createIndex('status', 'status', { unique: false });
          }
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  private async seedInitialDataIfEmpty(db: IDBDatabase): Promise<void> {
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const countReq = store.count();

        countReq.onsuccess = () => {
          if (countReq.result === 0) {
            const writeTx = db.transaction(STORE_NAME, 'readwrite');
            const writeStore = writeTx.objectStore(STORE_NAME);
            const now = Date.now();
            for (const item of SAMPLE_OBSERVATIONS) {
              writeStore.put({
                ...item,
                last_modified: item.last_modified || now,
              });
            }
            writeTx.oncomplete = () => resolve();
            writeTx.onerror = () => resolve();
          } else {
            resolve();
          }
        };
        countReq.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async getAll(): Promise<Observation[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          const results: Observation[] = request.result || [];
          results.sort((a, b) => b.timestamp - a.timestamp);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Fallback to local storage or sample data
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('wildlens_fallback_obs');
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            // ignore
          }
        }
      }
      return SAMPLE_OBSERVATIONS;
    }
  }

  async getById(id: string): Promise<Observation | undefined> {
    const list = await this.getAll();
    return list.find((o) => o.id === id);
  }

  async add(obs: Observation): Promise<Observation> {
    const prepared: Observation = {
      ...obs,
      last_modified: obs.last_modified || Date.now(),
    };

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(prepared);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Local storage fallback
      const list = await this.getAll();
      const updated = [prepared, ...list.filter((x) => x.id !== prepared.id)];
      if (typeof window !== 'undefined') {
        localStorage.setItem('wildlens_fallback_obs', JSON.stringify(updated));
      }
    }

    this.markPendingSync(prepared.id);
    return prepared;
  }

  async update(obs: Observation): Promise<void> {
    const prepared: Observation = {
      ...obs,
      last_modified: Date.now(),
    };
    await this.add(prepared);
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      const list = await this.getAll();
      const filtered = list.filter((x) => x.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('wildlens_fallback_obs', JSON.stringify(filtered));
      }
    }
    this.unmarkPendingSync(id);
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('wildlens_fallback_obs');
      }
    }
  }

  async exportJson(): Promise<string> {
    const items = await this.getAll();
    return JSON.stringify(
      {
        version: '1.4.0',
        exported_at: new Date().toISOString(),
        application: 'WildLens AI Naturalist Field Guide',
        license: 'Field Observation Export / Naturalist Record',
        observations_count: items.length,
        observations: items,
      },
      null,
      2
    );
  }

  // --- Synchronization & Conflict Resolution ---

  private markPendingSync(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const queue = this.getPendingSyncIds();
      if (!queue.includes(id)) {
        queue.push(id);
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch {}
  }

  private unmarkPendingSync(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      const queue = this.getPendingSyncIds().filter((qid) => qid !== id);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch {}
  }

  getPendingSyncIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  getLastSyncedAt(): number | null {
    if (typeof window === 'undefined') return null;
    try {
      const val = localStorage.getItem(LAST_SYNCED_KEY);
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Synchronizes local Field Journal entries with FastAPI backend /api/journal/sync.
   *
   * Conflict Resolution:
   * - Uses last_modified timestamps.
   * - Client never duplicates observations (keyed by observation.id).
   * - Server observations only replace local if server.last_modified > local.last_modified.
   * - Newer local edits are safely preserved and upstreamed to server.
   */
  async syncWithServer(clientId: string = 'browser-client'): Promise<JournalSyncResponse> {
    if (this.syncInProgress) {
      return {
        status: 'in_progress',
        synced_count: 0,
        server_observations: [],
        message: 'Sync already in progress.',
      };
    }

    const endpoint = getApiUrl('api/journal/sync');
    if (!endpoint || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      const pending = this.getPendingSyncIds();
      return {
        status: 'offline_queued',
        synced_count: pending.length,
        server_observations: [],
        message: `${pending.length} observation changes safely stored offline in local IndexedDB. Will sync when connectivity returns.`,
      };
    }

    this.syncInProgress = true;
    try {
      const localObservations = await this.getAll();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          observations: localObservations,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed with HTTP ${response.status}`);
      }

      const syncResult: JournalSyncResponse = await response.json();
      const serverObservations = syncResult.server_observations || [];

      // Conflict-free local merge
      const localMap = new Map(localObservations.map((o) => [o.id, o]));
      let mergedCount = 0;

      for (const serverObs of serverObservations) {
        const localObs = localMap.get(serverObs.id);
        if (!localObs) {
          // New record from server: add to local DB
          await this.putDirect(serverObs);
          mergedCount++;
        } else {
          const serverMod = serverObs.last_modified || 0;
          const localMod = localObs.last_modified || 0;
          // Only update if server copy is strictly newer than our local edit
          if (serverMod > localMod) {
            await this.putDirect(serverObs);
            mergedCount++;
          }
        }
      }

      // Clear sync queue and update timestamp
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SYNC_QUEUE_KEY);
        localStorage.setItem(LAST_SYNCED_KEY, Date.now().toString());
        window.dispatchEvent(new CustomEvent('wildlens:journal_synced', { detail: syncResult }));
      }

      return {
        status: 'success',
        synced_count: syncResult.synced_count || mergedCount,
        server_observations: serverObservations,
        message: `Successfully synchronized ${syncResult.synced_count || localObservations.length} field observations.`,
      };
    } catch (err: any) {
      console.warn('[WildLens Journal] Sync with server error:', err);
      const pending = this.getPendingSyncIds();
      return {
        status: 'offline_queued',
        synced_count: pending.length,
        server_observations: [],
        message: 'Could not connect to sync service. Changes remain preserved in local storage.',
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async putDirect(obs: Observation): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(obs);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // ignore
    }
  }
}

export const journalDb = new JournalDatabase();
