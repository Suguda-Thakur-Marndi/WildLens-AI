import { IdentificationResult, ModelTelemetry, FieldMission } from '@/src/types';
import { FIELD_MISSIONS, PRESET_TEST_SPECIMENS } from './sampleData';

export type ApiErrorType =
  | 'unconfigured_backend'
  | 'static_host_405'
  | 'not_found_404'
  | 'cold_start_or_server_error'
  | 'network_error'
  | 'validation_error';

export class WildLensApiError extends Error {
  public status?: number;
  public errorType: ApiErrorType;
  public userMessage: string;
  public technicalDetails?: string;
  public isHttpError: boolean;
  public canRetry: boolean;

  constructor(options: {
    message: string;
    status?: number;
    errorType: ApiErrorType;
    userMessage: string;
    technicalDetails?: string;
    canRetry?: boolean;
  }) {
    super(options.message);
    this.name = 'WildLensApiError';
    this.status = options.status;
    this.errorType = options.errorType;
    this.userMessage = options.userMessage;
    this.technicalDetails = options.technicalDetails;
    this.isHttpError = Boolean(options.status);
    this.canRetry = options.canRetry ?? true;
  }
}

/**
 * Checks if a given hostname indicates a local development machine.
 */
export function isLocalhostAddress(hostname: string): boolean {
  if (!hostname) return false;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

/**
 * Checks if a URL or hostname points to a static GitHub Pages domain.
 * GitHub Pages is a static host and will return HTTP 405 on POST requests.
 */
export function isGitHubPagesHost(urlOrHost: string): boolean {
  if (!urlOrHost) return false;
  try {
    const parsed =
      urlOrHost.startsWith('http://') || urlOrHost.startsWith('https://')
        ? new URL(urlOrHost)
        : null;
    const host = (parsed ? parsed.hostname : urlOrHost).toLowerCase();
    return host.endsWith('.github.io');
  } catch {
    return urlOrHost.toLowerCase().includes('.github.io');
  }
}

/**
 * Retrieve user-configured custom API URL stored in localStorage (if any).
 */
export function getStoredApiUrl(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage?.getItem('wildlens_api_url');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch {
      // localStorage may fail in restricted/private contexts
    }
  }
  return null;
}

/**
 * Persist or clear user-configured custom API URL in localStorage.
 */
export function setStoredApiUrl(url: string | null): void {
  if (typeof window !== 'undefined') {
    try {
      if (url && url.trim()) {
        window.localStorage?.setItem('wildlens_api_url', url.trim().replace(/\/+$/, ''));
      } else {
        window.localStorage?.removeItem('wildlens_api_url');
      }
    } catch {}
  }
}

/**
 * Resolves the appropriate FastAPI backend base URL.
 * Never targets localhost in production, and never uses GitHub Pages domain as the FastAPI API host.
 */
export function getApiBaseUrl(): string {
  // 1. User-configured override stored in browser localStorage
  const storedUrl = getStoredApiUrl();
  if (storedUrl && storedUrl.trim()) {
    return storedUrl.trim().replace(/\/+$/, '');
  }

  // Determine if the current client is in a local development browser environment
  const isBrowserLocal =
    typeof window !== 'undefined' && isLocalhostAddress(window.location.hostname);

  // 2. Configured public API URL via environment variables
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (configuredUrl && configuredUrl.trim()) {
    const cleaned = configuredUrl.trim().replace(/\/+$/, '');

    // Validate configured URL in production browser context
    if (typeof window !== 'undefined' && !isBrowserLocal) {
      try {
        const parsed = new URL(cleaned);
        // Prevent accidental localhost target in production mobile/web clients
        if (isLocalhostAddress(parsed.hostname)) {
          console.warn(
            `[WildLens API] Configured NEXT_PUBLIC_API_URL points to localhost (${cleaned}), which is unreachable from production mobile/web clients. Ignoring.`
          );
          return '';
        }
        // Prevent using GitHub Pages domain as the FastAPI backend host
        if (isGitHubPagesHost(parsed.hostname)) {
          console.warn(
            `[WildLens API] Configured NEXT_PUBLIC_API_URL points to GitHub Pages (${cleaned}). GitHub Pages is a static host and cannot process FastAPI POST requests. Ignoring.`
          );
          return '';
        }
      } catch {
        return '';
      }
    }

    return cleaned;
  }

  // 3. Server-side environment during SSR or build
  if (typeof window === 'undefined' && process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.trim().replace(/\/+$/, '');
  }

  // 4. Browser environment check for local development and LAN fallback
  if (isBrowserLocal) {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return `http://${window.location.hostname}:8000`;
    }
    return 'http://127.0.0.1:8000';
  }

  // In production static hosting without an explicit backend configured, do not guess
  return '';
}

/**
 * Returns true if a valid FastAPI backend base URL is configured.
 */
export function isBackendConfigured(): boolean {
  const baseUrl = getApiBaseUrl();
  return Boolean(baseUrl && baseUrl.trim().length > 0);
}

/**
 * Constructs a full API URL for a subpath.
 * In production without a configured backend, returns an empty string to prevent
 * invalid relative requests targeting the static host (e.g. GitHub Pages).
 */
export function getApiUrl(subpath: string): string {
  const cleanPath = subpath.startsWith('/') ? subpath.slice(1) : subpath;
  const baseUrl = getApiBaseUrl();

  if (baseUrl) {
    return `${baseUrl}/${cleanPath}`;
  }

  // When no backend base URL is configured in production, return empty string.
  // Never return relative path '/${cleanPath}' which sends POST requests to GitHub Pages
  // resulting in HTTP 405 Method Not Allowed.
  return '';
}

/**
 * Pings the target backend URL to verify connectivity and readiness.
 */
export async function testBackendConnection(targetUrl?: string): Promise<{
  ok: boolean;
  status: number;
  latencyMs: number;
  data?: any;
  error?: string;
}> {
  const url = (targetUrl || getApiBaseUrl()).replace(/\/+$/, '');
  if (!url) {
    return {
      ok: false,
      status: 0,
      latencyMs: 0,
      error: 'No backend API URL provided.',
    };
  }

  const start = performance.now();
  try {
    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      const data = await res.json();
      return { ok: true, status: res.status, latencyMs, data };
    } else {
      let errText = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        errText = j.detail || j.message || errText;
      } catch {}
      return { ok: false, status: res.status, latencyMs, error: errText };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      status: 0,
      latencyMs,
      error: err.message || 'Network connection failed (possible CORS or offline issue).',
    };
  }
}

export async function fetchModelStatus(): Promise<ModelTelemetry> {
  const endpoint = getApiUrl('api/model/status');
  const isLocal =
    typeof window !== 'undefined' && isLocalhostAddress(window.location.hostname);

  if (!endpoint) {
    return {
      status: 'unavailable',
      model_name: 'imageomics/bioclip-2 (Backend Disconnected)',
      model_revision: '2957b322090f9cb17ae72c71981c7218a28d81e0',
      model_license: 'MIT',
      device: isLocal ? 'FastAPI Backend Offline' : 'External FastAPI Backend Required',
      cache_directory: 'models/bioclip_cache',
      supported_taxa_count: 36,
      offline_capable: false,
      memory_usage_mb: null,
      vision_model_id: 'imageomics/bioclip-2',
      vision_model_license: 'MIT',
      vision_device: 'disconnected',
      vision_memory_mb: null,
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    const data = await res.json();
    return {
      status: data.status || 'ready',
      model_name: data.vision_model_id || data.model_name || 'imageomics/bioclip-2',
      model_revision: data.model_revision || '2957b322090f9cb17ae72c71981c7218a28d81e0',
      model_license: data.vision_model_license || data.model_license || 'MIT',
      device: data.vision_device || data.device || 'cpu',
      cache_directory: data.cache_directory || 'models/bioclip_cache',
      supported_taxa_count: data.supported_taxa_count || 36,
      offline_capable: data.offline_capable ?? true,
      memory_usage_mb: data.memory_usage_mb ?? data.vision_memory_mb ?? null,
      vision_model_id: data.vision_model_id || data.model_name || 'imageomics/bioclip-2',
      vision_model_license: data.vision_model_license || data.model_license || 'MIT',
      vision_device: data.vision_device || data.device || 'cpu',
      vision_memory_mb: data.vision_memory_mb ?? data.memory_usage_mb ?? null,
    };
  } catch (err) {
    console.warn('API model status unreachable:', err);
    return {
      status: 'unavailable',
      model_name: 'imageomics/bioclip-2 (Backend Disconnected)',
      model_revision: '2957b322090f9cb17ae72c71981c7218a28d81e0',
      model_license: 'MIT',
      device: isLocal ? 'FastAPI Backend Offline' : 'External FastAPI Backend Required',
      cache_directory: 'models/bioclip_cache',
      supported_taxa_count: 36,
      offline_capable: false,
      memory_usage_mb: null,
      vision_model_id: 'imageomics/bioclip-2',
      vision_model_license: 'MIT',
      vision_device: 'disconnected',
      vision_memory_mb: null,
    };
  }
}

function findMatchingPreset(file: File) {
  return PRESET_TEST_SPECIMENS.find((p) =>
    file.name && p.file && file.name.toLowerCase().includes(p.file.replace('.jpg', '').toLowerCase())
  );
}

function buildPresetResult(matchingPreset: any, file: File, startTime: number): IdentificationResult {
  const elapsed = Math.round(performance.now() - startTime);
  return {
    top_candidate: matchingPreset.candidate,
    alternatives: matchingPreset.candidate.lookalikes.map((lk: any) => ({
      common_name: lk.common_name,
      scientific_name: lk.scientific_name,
      confidence: lk.confidence,
      similarity_score: lk.confidence,
      family: matchingPreset.candidate.family,
      diagnostic_traits: [lk.difference],
    })),
    latency_ms: elapsed || 380,
    model_name: 'imageomics/bioclip-2 (Preset Specimen)',
    similarity_score: matchingPreset.candidate.confidence,
    confidence_status: matchingPreset.candidate.confidence > 0.8 ? 'confident' : 'moderate',
    candidate_count: 37,
    certainty_rating: matchingPreset.candidate.confidence > 0.8 ? 'high' : 'moderate',
    timestamp: new Date().toISOString(),
    image_url: URL.createObjectURL(file),
    distinguishing_features: matchingPreset.candidate.diagnostic_traits,
    suggestions: [
      'Take two minutes to observe its physical environment without using your screen.',
      'Check whether the specimen is in direct sunlight or moist shade.',
    ],
    is_offline: true,
  };
}

export async function identifyImageFile(file: File): Promise<IdentificationResult> {
  const startTime = performance.now();
  const apiUrl = getApiUrl('api/identify');
  const isLocal =
    typeof window !== 'undefined' && isLocalhostAddress(window.location.hostname);

  // If no backend API URL is configured
  if (!apiUrl) {
    // Check if the file matches one of the bundled offline test specimens
    const matchingPreset = findMatchingPreset(file);
    if (matchingPreset) {
      return buildPresetResult(matchingPreset, file, startTime);
    }

    if (isLocal) {
      throw new WildLensApiError({
        message: 'Local BioCLIP backend unreachable.',
        errorType: 'unconfigured_backend',
        userMessage:
          'Local FastAPI backend is not running on http://127.0.0.1:8000. Start it via `python -m uvicorn app.main:app --reload` in your terminal.',
        technicalDetails: 'Localhost fallback active, but no connection was established.',
        canRetry: true,
      });
    }

    throw new WildLensApiError({
      message: 'FastAPI backend service not configured.',
      errorType: 'unconfigured_backend',
      userMessage:
        'WildLens AI website is hosted on GitHub Pages (static hosting). Real-time BioCLIP-2 AI vision inference requires an external FastAPI backend service. Configure your backend URL in Settings or test with preset specimens below.',
      technicalDetails:
        'NEXT_PUBLIC_API_URL environment variable is unset, and no custom API URL is saved in Settings.',
      canRetry: false,
    });
  }

  // Attempt inference against configured FastAPI BioCLIP service
  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      const elapsed = Math.round(performance.now() - startTime);

      const mapCandidate = (c: any) => {
        const tax = c.taxonomy || {};
        return {
          common_name: c.common_name,
          scientific_name: c.scientific_name,
          confidence: c.confidence ?? c.softmax_density ?? 0.0,
          softmax_density: c.softmax_density ?? c.confidence ?? 0.0,
          similarity_score: c.similarity_score ?? 0.0,
          kingdom: tax.kingdom || c.kingdom || 'Plantae',
          phylum: tax.phylum || c.phylum,
          class_name: tax.class_name || tax.class || c.class_name,
          order: tax.order || c.order,
          family: tax.family || c.family,
          genus: tax.genus || c.genus,
          species: tax.species || c.species,
          diagnostic_traits: c.visual_characteristics || c.diagnostic_traits || [],
          distinguishing_features: c.distinguishing_features || [],
          field_verification_tip: c.field_verification_tip || '',
          lookalikes: (c.lookalikes || []).map((lk: any) =>
            typeof lk === 'string'
              ? { common_name: lk, scientific_name: '', confidence: 0, difference: '' }
              : lk
          ),
          habitat: c.habitat_notes || c.habitat || '',
        };
      };

      const isInconclusive =
        data.confidence_status === 'inconclusive' || data.uncertainty_rating === 'inconclusive';

      let topCandidate: any;
      let alternatives: any[];

      if (isInconclusive) {
        topCandidate = {
          common_name: data.common_name || 'Not in my database',
          scientific_name: data.scientific_name || 'Subject not recognized in candidate catalog',
          confidence: data.similarity_score ?? 0.0,
          softmax_density: data.softmax_density ?? 0.0,
          similarity_score: data.similarity_score ?? 0.0,
          kingdom: 'Indeterminate',
          family: 'Catalog Gap / Out-of-Distribution',
          diagnostic_traits: [
            'Visual feature alignment is below candidate acceptance threshold (similarity < 0.60)',
            'Organism is unrepresented in the candidate catalog (36 reference taxa)',
            'Nearest mathematical matches below are tentative references only and must not be treated as confirmed species',
          ],
          distinguishing_features: [
            'Compare tentative candidate matches below or capture a closer photograph in natural daylight',
          ],
          field_verification_tip: 'Observe living specimen in the field to check key diagnostic traits.',
          lookalikes: [],
          habitat: 'Natural Environment',
        };
        const allCandidates = data.top_k_predictions || data.alternative_candidates || [];
        alternatives = allCandidates.map(mapCandidate);
      } else {
        const rawPrimary =
          data.primary_candidate ||
          data.top_candidate ||
          (data.top_k_predictions && data.top_k_predictions[0]);
        if (!rawPrimary) {
          throw new WildLensApiError({
            message: 'Identification engine returned an empty candidate list.',
            status: 200,
            errorType: 'validation_error',
            userMessage: 'The AI model completed inference but returned no taxonomic candidates.',
            canRetry: true,
          });
        }
        topCandidate = mapCandidate(rawPrimary);
        const rawAlts =
          data.alternative_candidates ||
          data.alternatives ||
          (data.top_k_predictions ? data.top_k_predictions.slice(1) : []);
        alternatives = rawAlts.map(mapCandidate);
      }

      const certaintyRating: 'high' | 'moderate' | 'uncertain' | 'inconclusive' =
        data.uncertainty_rating === 'confident'
          ? 'high'
          : data.uncertainty_rating === 'moderate'
          ? 'moderate'
          : data.uncertainty_rating === 'inconclusive'
          ? 'inconclusive'
          : 'uncertain';

      return {
        top_candidate: topCandidate,
        alternatives,
        top_k_predictions: [topCandidate, ...alternatives],
        latency_ms: data.inference_time_ms || data.latency_ms || elapsed,
        model_name: data.model_name || data.model_identifier || 'imageomics/bioclip-2',
        model_version: data.model_version || '2957b322090f9cb17ae72c71981c7218a28d81e0',
        similarity_score: data.similarity_score ?? topCandidate.similarity_score,
        softmax_density:
          data.softmax_density ?? topCandidate.softmax_density ?? topCandidate.confidence,
        calibrated_probability: data.calibrated_probability ?? null,
        catalog_scope:
          data.catalog_scope || `${data.candidate_count || 36} curated temperate woodland taxa`,
        confidence_status: data.confidence_status || data.uncertainty_rating || 'confident',
        candidate_count: data.candidate_count || 36,
        uncertainty_warning: data.uncertainty_warning,
        certainty_rating: certaintyRating,
        timestamp: new Date().toISOString(),
        image_url: URL.createObjectURL(file),
        distinguishing_features:
          topCandidate.distinguishing_features && topCandidate.distinguishing_features.length > 0
            ? topCandidate.distinguishing_features
            : data.distinguishing_features || [],
        suggestions: data.suggested_outdoor_inspection || data.suggestions || [
          'Observe the specimen in situ from a respectful distance.',
          'Notice petal arrangement, leaf venation, or plumage patterns in natural daylight.',
        ],
        is_offline: data.offline_verified ?? data.is_offline ?? true,
      };
    } else {
      // Differentiate HTTP error status codes
      if (res.status === 405) {
        throw new WildLensApiError({
          message: `HTTP 405 Method Not Allowed received from ${apiUrl}.`,
          status: 405,
          errorType: 'static_host_405',
          userMessage:
            'HTTP 405 Method Not Allowed: The configured API host does not allow POST requests. This occurs when the API URL points to static hosting (such as GitHub Pages) instead of an active FastAPI server.',
          technicalDetails: `POST ${apiUrl} returned HTTP 405 Method Not Allowed. Ensure NEXT_PUBLIC_API_URL points to your deployed FastAPI backend.`,
          canRetry: false,
        });
      }

      if (res.status === 404) {
        throw new WildLensApiError({
          message: `HTTP 404 Not Found from ${apiUrl}.`,
          status: 404,
          errorType: 'not_found_404',
          userMessage:
            'HTTP 404 Not Found: The /api/identify endpoint was not found on the server. Please verify the backend route and prefix.',
          technicalDetails: `POST ${apiUrl} returned HTTP 404 Not Found.`,
          canRetry: false,
        });
      }

      if (res.status === 400 || res.status === 422) {
        let validationMsg = 'Invalid image payload';
        try {
          const errJson = await res.json();
          validationMsg = errJson.detail || errJson.message || validationMsg;
        } catch {}
        throw new WildLensApiError({
          message: validationMsg,
          status: res.status,
          errorType: 'validation_error',
          userMessage: `Image validation failed: ${validationMsg}`,
          technicalDetails: `POST ${apiUrl} returned HTTP ${res.status}.`,
          canRetry: true,
        });
      }

      // 500, 502, 503, 504 server error or cold start
      let serverDetail = `Server responded with status ${res.status}`;
      try {
        const errJson = await res.json();
        serverDetail = errJson.detail || errJson.message || serverDetail;
      } catch {}

      const isColdStart = res.status === 502 || res.status === 503 || res.status === 504;
      throw new WildLensApiError({
        message: serverDetail,
        status: res.status,
        errorType: 'cold_start_or_server_error',
        userMessage: isColdStart
          ? 'Backend service is starting up or temporarily busy. If hosted on a free cloud tier (Render, Railway, Hugging Face), cold starts can take 30-60 seconds. Please retry in a moment.'
          : `Backend server error (${res.status}): ${serverDetail}`,
        technicalDetails: `POST ${apiUrl} returned HTTP ${res.status}.`,
        canRetry: true,
      });
    }
  } catch (err: any) {
    // If it is already a WildLensApiError, check if we can fall back to preset
    if (err instanceof WildLensApiError) {
      const matchingPreset = findMatchingPreset(file);
      if (matchingPreset && (err.errorType === 'network_error' || err.errorType === 'static_host_405' || err.errorType === 'unconfigured_backend')) {
        return buildPresetResult(matchingPreset, file, startTime);
      }
      throw err;
    }

    // Network connection failures (fetch rejected, DNS failed, CORS blocked, offline)
    const matchingPreset = findMatchingPreset(file);
    if (matchingPreset) {
      return buildPresetResult(matchingPreset, file, startTime);
    }

    const baseUrl = getApiBaseUrl();
    throw new WildLensApiError({
      message: `Backend connection failed: ${err.message || 'network error'}`,
      errorType: 'network_error',
      userMessage: `Unable to connect to BioCLIP backend at ${baseUrl || apiUrl}. Please check that the server is online, allows CORS from this site, and your device has internet access.`,
      technicalDetails: `Fetch failed for ${apiUrl}: ${err.message || 'Failed to fetch'}`,
      canRetry: true,
    });
  }
}

export async function fetchMissions(): Promise<FieldMission[]> {
  const endpoint = getApiUrl('api/missions');
  if (!endpoint) {
    return FIELD_MISSIONS;
  }

  try {
    const res = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((m: any, idx: number) => ({
          id: m.id || `mission-${idx}`,
          title: m.title,
          category: (m.category?.toLowerCase().includes('flora')
            ? 'botany'
            : m.category?.toLowerCase().includes('insects')
            ? 'wildlife'
            : 'observation') as any,
          duration: m.suggested_duration || '5 min',
          difficulty: 'Easy',
          description: m.short_objective || m.title,
          instructions: m.instructions || [],
          prompts: [m.safety_reminder || 'Remain respectful of the habitat.'],
          image_url:
            FIELD_MISSIONS[idx % FIELD_MISSIONS.length]?.image_url || FIELD_MISSIONS[0].image_url,
        }));
      }
    }
  } catch (err) {
    console.warn('Backend /api/missions unreachable, using local mission library', err);
  }
  return FIELD_MISSIONS;
}
