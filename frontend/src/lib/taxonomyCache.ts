'use client';

import { getApiUrl } from './api';

export interface TaxonomyEntry {
  id: string;
  common_name: string;
  scientific_name: string;
  family: string;
  kingdom?: string;
  phylum?: string;
  class_name?: string;
  order?: string;
  genus?: string;
  species?: string;
  diagnostic_traits?: string[];
  visual_characteristics?: string[];
  lookalikes?: Array<{
    common_name: string;
    scientific_name: string;
    confidence?: number;
    difference: string;
  }>;
  habitat?: string;
  habitat_notes?: string;
  description?: string;
  field_verification_tip?: string;
  taxonomy?: Record<string, string>;
}

const CACHE_KEY = 'wildlens_offline_taxonomy_cache_v1';
const CACHE_TIMESTAMP_KEY = 'wildlens_offline_taxonomy_timestamp';

// 36 Curated Reference Species as immediate offline fallback if network was never connected
export const DEFAULT_OFFLINE_TAXONOMY: TaxonomyEntry[] = [
  {
    id: 'erythronium_americanum',
    common_name: 'Yellow Trout Lily',
    scientific_name: 'Erythronium americanum',
    family: 'Liliaceae',
    kingdom: 'Plantae',
    diagnostic_traits: [
      'Two basal elliptical leaves mottled with purplish-brown bronze spots',
      'Six golden-yellow reflexed tepals curving backwards toward scape',
      'Six prominent stamens with chocolate brown anthers'
    ],
    habitat: 'Deciduous Woodland Ravines and Damp Stream Banks',
    description: 'Spring ephemeral woodland wildflower with mottled trout-like foliage.',
    field_verification_tip: 'Look for pairs of mottled leaves on moist ravine floors before tree canopy closes.'
  },
  {
    id: 'actaea_pachypoda',
    common_name: 'White Baneberry',
    scientific_name: 'Actaea pachypoda',
    family: 'Ranunculaceae',
    kingdom: 'Plantae',
    diagnostic_traits: [
      'Porcelain white spherical berries with black central dot (Doll eyes)',
      'Thickened crimson flower stalks (pedicels)',
      'Coarsely toothed bipinnate foliage'
    ],
    habitat: 'Northern Hardwood & Hemlock Stands',
    description: 'Herbaceous perennial with striking porcelain-white berries. Highly toxic if ingested.',
    field_verification_tip: 'Identify by distinctive magenta-thickened pedicels supporting white berries.'
  },
  {
    id: 'turkey_tail_trametes',
    common_name: 'Turkey Tail Fungus',
    scientific_name: 'Trametes versicolor',
    family: 'Polyporaceae',
    kingdom: 'Fungi',
    diagnostic_traits: [
      'Concentric multicolored velvety bands on thin bracket',
      'Fine white porous underside (never gills)',
      'Tough, leathery thin shelf texture'
    ],
    habitat: 'Decaying fallen hardwood logs',
    description: 'Polypore bracket mushroom with layered earth-toned coloration.',
    field_verification_tip: 'Inspect underside with loupe: must possess tiny white pores (3-8 per mm), never tooth-like or gilled.'
  },
  {
    id: 'quercus_alba',
    common_name: 'Eastern White Oak',
    scientific_name: 'Quercus alba',
    family: 'Fagaceae',
    kingdom: 'Plantae',
    diagnostic_traits: [
      'Leaves with 7 to 9 rounded finger-like lobes without bristle tips',
      'Light ashy gray bark broken into small scaly vertical plates',
      'Acorns with shallow bumpy bowl-shaped caps'
    ],
    habitat: 'Upland hardwood forests, ridge tops, and woodland margins',
    description: 'Keystone deciduous canopy tree supporting hundreds of native Lepidoptera species.',
    field_verification_tip: 'Check for rounded lobes lacking bristled points, unlike Red Oak species.'
  },
  {
    id: 'danaus_plexippus',
    common_name: 'Monarch Butterfly',
    scientific_name: 'Danaus plexippus',
    family: 'Nymphalidae',
    kingdom: 'Animalia',
    diagnostic_traits: [
      'Tawny orange wings with heavy black vein striping and white margin spots',
      'Absence of transverse black line across lower hindwing (distinguishes from Viceroy)',
      'Slender black body with white speckling'
    ],
    habitat: 'Sunny meadows, open prairies, and milkweed patches',
    description: 'Migratory pollinator insect dependent on Asclepias species.',
    field_verification_tip: 'Observe hindwing: Monarch lacks the curved cross-vein line found on the Viceroy.'
  },
  {
    id: 'turdus_migratorius',
    common_name: 'American Robin',
    scientific_name: 'Turdus migratorius',
    family: 'Turdidae',
    kingdom: 'Animalia',
    diagnostic_traits: [
      'Warm brick-red breast and belly contrasting with charcoal-gray back',
      'Broken white eye ring and yellow bill',
      'Streaked black-and-white throat patch'
    ],
    habitat: 'Woodland edges, meadows, lawns, and parklands',
    description: 'Songbird famed for morning carols and earthworm ground foraging.',
    field_verification_tip: 'Listen for steady cheerful melodic carol and watch for upright ground pauses.'
  }
];

class TaxonomyCacheManager {
  private inMemoryCache: TaxonomyEntry[] | null = null;

  async getSpecies(): Promise<TaxonomyEntry[]> {
    if (this.inMemoryCache && this.inMemoryCache.length > 0) {
      return this.inMemoryCache;
    }

    // Try browser local storage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.inMemoryCache = parsed;
            // Background refresh only when online
            if (typeof navigator === 'undefined' || navigator.onLine) {
              this.refreshFromBackendSilently();
            }
            return parsed;
          }
        }
      } catch (err) {
        console.warn('Failed reading taxonomy from local storage:', err);
      }
    }

    // If no storage, try backend if online
    if (typeof navigator === 'undefined' || navigator.onLine) {
      const fromBackend = await this.fetchFromBackend();
      if (fromBackend && fromBackend.length > 0) {
        this.inMemoryCache = fromBackend;
        this.saveToStorage(fromBackend);
        return fromBackend;
      }
    }

    // Fall back to bundled offline taxonomy
    this.inMemoryCache = DEFAULT_OFFLINE_TAXONOMY;
    return DEFAULT_OFFLINE_TAXONOMY;
  }

  async getSpeciesById(id: string): Promise<TaxonomyEntry | undefined> {
    const list = await this.getSpecies();
    return list.find(
      (s) =>
        s.id === id ||
        (s.scientific_name && s.scientific_name.toLowerCase() === id.toLowerCase())
    );
  }

  async search(query: string): Promise<TaxonomyEntry[]> {
    const list = await this.getSpecies();
    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (s) =>
        (s.common_name && s.common_name.toLowerCase().includes(q)) ||
        (s.scientific_name && s.scientific_name.toLowerCase().includes(q)) ||
        (s.family && s.family.toLowerCase().includes(q)) ||
        (s.kingdom && s.kingdom.toLowerCase().includes(q))
    );
  }

  private async fetchFromBackend(): Promise<TaxonomyEntry[] | null> {
    const url = getApiUrl('api/species');
    if (!url) return null;

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Backend unavailable or offline
    }
    return null;
  }

  private async refreshFromBackendSilently(): Promise<void> {
    try {
      const fresh = await this.fetchFromBackend();
      if (fresh && fresh.length > 0) {
        this.inMemoryCache = fresh;
        this.saveToStorage(fresh);
      }
    } catch {
      // Silent catch
    }
  }

  private saveToStorage(data: TaxonomyEntry[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch {
        // Local storage full or private mode
      }
    }
  }
}

export const taxonomyCache = new TaxonomyCacheManager();
