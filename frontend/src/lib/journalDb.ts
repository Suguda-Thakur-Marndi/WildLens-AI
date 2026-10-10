import { Observation } from '@/src/types';
import { SAMPLE_OBSERVATIONS } from './sampleData';

const DB_NAME = 'wildlens_field_guide_db';
const DB_VERSION = 1;
const STORE_NAME = 'observations';

class JournalDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

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
            for (const item of SAMPLE_OBSERVATIONS) {
              writeStore.put(item);
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
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(obs);

        request.onsuccess = () => resolve(obs);
        request.onerror = () => reject(request.error);
      });
    } catch {
      // Local storage fallback
      const list = await this.getAll();
      const updated = [obs, ...list.filter((x) => x.id !== obs.id)];
      if (typeof window !== 'undefined') {
        localStorage.setItem('wildlens_fallback_obs', JSON.stringify(updated));
      }
      return obs;
    }
  }

  async update(obs: Observation): Promise<void> {
    await this.add(obs);
  }

  async delete(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
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
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
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
        observations: items
      },
      null,
      2
    );
  }
}

export const journalDb = new JournalDatabase();
