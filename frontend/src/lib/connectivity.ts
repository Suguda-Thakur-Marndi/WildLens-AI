'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, isLocalhostAddress } from './api';

export type BioclipStatus = 'ready' | 'loading' | 'unavailable' | 'error';
export type GeminiStatus = 'ready' | 'unconfigured' | 'unavailable' | 'offline';

export interface ServiceConnectivityState {
  // 1. Raw reachability signals
  isOnline: boolean; // Window / Navigator connectivity signal
  backendConnected: boolean; // Verified response from FastAPI /api/health
  isLocalBackend: boolean; // Whether backend is running on local machine (127.0.0.1/localhost)

  // 2. Subsystem status
  bioclipStatus: BioclipStatus;
  geminiStatus: GeminiStatus;
  geminiModel?: string;
  catalogTaxaCount: number;
  latencyMs: number;

  // 3. User-facing unified status indicators
  badgeText: string;
  badgeShortText: string;
  badgeDotClass: string;
  badgeColorTheme: 'success' | 'info' | 'warning' | 'offline' | 'error';
  statusDescription: string;

  // 4. Offline capability honesty
  canPerformOfflineInference: boolean;
  offlineExplanation: string;

  // 5. Metadata
  lastCheckedAt: number;
  checking: boolean;
}

/**
 * Derives user-facing indicators from current reachability and service state.
 */
function deriveStatusIndicators(state: {
  isOnline: boolean;
  backendConnected: boolean;
  isLocalBackend: boolean;
  bioclipStatus: BioclipStatus;
  geminiStatus: GeminiStatus;
}) {
  const { isOnline, backendConnected, isLocalBackend, bioclipStatus, geminiStatus } = state;

  // 1. Device is Offline (navigator.onLine is false)
  if (!isOnline) {
    if (backendConnected && isLocalBackend && bioclipStatus === 'ready') {
      return {
        badgeText: 'Local AI Ready',
        badgeShortText: 'Local AI',
        badgeDotClass: 'bg-secondary',
        badgeColorTheme: 'success' as const,
        statusDescription:
          'Local BioCLIP-2 vision runtime active on 127.0.0.1. Optical inference operates 100% on-device with zero cell service required.',
        canPerformOfflineInference: true,
        offlineExplanation: 'Offline optical inference supported via local BioCLIP-2 engine.',
      };
    }
    return {
      badgeText: 'Offline Mode',
      badgeShortText: 'Offline',
      badgeDotClass: 'bg-zinc-400',
      badgeColorTheme: 'offline' as const,
      statusDescription:
        'No internet connection. Field Journal entries, cached taxonomy, and preset specimens remain 100% accessible locally.',
      canPerformOfflineInference: false,
      offlineExplanation:
        'No local neural runtime running in browser. Cloud and remote inference unavailable while offline.',
    };
  }

  // 2. Device is Online: Local AI Ready
  if (backendConnected && isLocalBackend && bioclipStatus === 'ready') {
    return {
      badgeText: 'Local AI Ready',
      badgeShortText: 'Local AI',
      badgeDotClass: 'bg-secondary',
      badgeColorTheme: 'success' as const,
      statusDescription:
        'Local BioCLIP-2 vision runtime active on 127.0.0.1. Optical inference operates 100% on-device with zero cloud egress.',
      canPerformOfflineInference: true,
      offlineExplanation: 'Offline optical inference supported via local BioCLIP-2 engine.',
    };
  }

  // 3. Device is Online: Remote AI Online
  if (backendConnected && !isLocalBackend && bioclipStatus === 'ready') {
    return {
      badgeText: 'Remote AI Online',
      badgeShortText: 'Remote AI',
      badgeDotClass: 'bg-emerald-500',
      badgeColorTheme: 'info' as const,
      statusDescription:
        'Connected to remote BioCLIP-2 FastAPI server. Live optical inference requires ongoing network connection.',
      canPerformOfflineInference: false,
      offlineExplanation:
        'Inference requires remote server. If network drops, only preset specimens and saved journal records remain accessible.',
    };
  }

  // 4. Backend connected but model is still loading weights
  if (backendConnected && bioclipStatus === 'loading') {
    return {
      badgeText: 'Loading AI Model...',
      badgeShortText: 'Loading AI',
      badgeDotClass: 'bg-amber-500 animate-pulse',
      badgeColorTheme: 'warning' as const,
      statusDescription: 'FastAPI backend connected; BioCLIP-2 neural weights are loading into memory.',
      canPerformOfflineInference: false,
      offlineExplanation: 'AI model is initializing.',
    };
  }

  // 5. Internet is online, but configured backend is unreachable
  return {
    badgeText: 'Service Unavailable',
    badgeShortText: 'Offline',
    badgeDotClass: 'bg-rose-500',
    badgeColorTheme: 'error' as const,
    statusDescription:
      'Internet connection detected, but FastAPI backend service is unreachable at the configured URL.',
    canPerformOfflineInference: false,
    offlineExplanation:
      'Backend is unreachable. Start local FastAPI server or configure API endpoint in Settings.',
  };
}

/**
 * Performs a lightweight health check against the backend.
 * Uses a strict 3500ms timeout to never block initial render or lock the UI.
 */
export async function checkServiceConnectivity(): Promise<ServiceConnectivityState> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const baseUrl = getApiBaseUrl();
  const isLocalBackend = isLocalhostAddress(baseUrl || (typeof window !== 'undefined' ? window.location.hostname : ''));

  let backendConnected = false;
  let bioclipStatus: BioclipStatus = 'unavailable';
  let geminiStatus: GeminiStatus = isOnline ? 'unavailable' : 'offline';
  let geminiModel: string | undefined = undefined;
  let catalogTaxaCount = 36;
  let latencyMs = 0;

  if (baseUrl && (isOnline || isLocalBackend)) {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        backendConnected = true;
        const data = await res.json();
        bioclipStatus = (data.model_status as BioclipStatus) || 'ready';
        catalogTaxaCount = data.catalog_taxa_count || 36;

        if (data.gemini_status) {
          geminiStatus = !isOnline ? 'offline' : (data.gemini_status as GeminiStatus);
        } else if (data.gemini_configured) {
          geminiStatus = !isOnline ? 'offline' : 'ready';
        }
      }
    } catch {
      backendConnected = false;
      bioclipStatus = 'unavailable';
      geminiStatus = isOnline ? 'unavailable' : 'offline';
    }
  }

  // Check Gemini specific status if backend is connected and online
  if (backendConnected && isOnline && baseUrl) {
    try {
      const gRes = await fetch(`${baseUrl}/api/gemini/status`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        geminiStatus = gData.status || (gData.configured ? 'ready' : 'unconfigured');
        geminiModel = gData.model;
      }
    } catch {
      // Non-critical, fallback to health report
    }
  }

  const indicators = deriveStatusIndicators({
    isOnline,
    backendConnected,
    isLocalBackend,
    bioclipStatus,
    geminiStatus,
  });

  return {
    isOnline,
    backendConnected,
    isLocalBackend,
    bioclipStatus,
    geminiStatus,
    geminiModel,
    catalogTaxaCount,
    latencyMs,
    badgeText: indicators.badgeText,
    badgeShortText: indicators.badgeShortText,
    badgeDotClass: indicators.badgeDotClass,
    badgeColorTheme: indicators.badgeColorTheme,
    statusDescription: indicators.statusDescription,
    canPerformOfflineInference: indicators.canPerformOfflineInference,
    offlineExplanation: indicators.offlineExplanation,
    lastCheckedAt: Date.now(),
    checking: false,
  };
}

/**
 * React hook that manages reactive connectivity and AI subsystem health.
 * Recovers automatically when network returns or backend reconnects.
 */
export function useServiceConnectivity() {
  const [state, setState] = useState<ServiceConnectivityState>(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const initialIndicators = deriveStatusIndicators({
      isOnline,
      backendConnected: false,
      isLocalBackend: true,
      bioclipStatus: 'unavailable',
      geminiStatus: isOnline ? 'unavailable' : 'offline',
    });

    return {
      isOnline,
      backendConnected: false,
      isLocalBackend: true,
      bioclipStatus: 'unavailable',
      geminiStatus: isOnline ? 'unavailable' : 'offline',
      catalogTaxaCount: 36,
      latencyMs: 0,
      badgeText: initialIndicators.badgeText,
      badgeShortText: initialIndicators.badgeShortText,
      badgeDotClass: initialIndicators.badgeDotClass,
      badgeColorTheme: initialIndicators.badgeColorTheme,
      statusDescription: initialIndicators.statusDescription,
      canPerformOfflineInference: initialIndicators.canPerformOfflineInference,
      offlineExplanation: initialIndicators.offlineExplanation,
      lastCheckedAt: 0,
      checking: false,
    };
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, checking: true }));
    try {
      const nextState = await checkServiceConnectivity();
      setState(nextState);
    } catch {
      setState((prev) => ({ ...prev, checking: false }));
    }
  }, []);

  useEffect(() => {
    // Perform initial background check (non-blocking)
    refresh();

    // Listen to browser network changes
    const handleOnline = () => {
      refresh();
    };

    const handleOffline = () => {
      setState((prev) => {
        const indicators = deriveStatusIndicators({
          isOnline: false,
          backendConnected: prev.isLocalBackend ? prev.backendConnected : false,
          isLocalBackend: prev.isLocalBackend,
          bioclipStatus: prev.bioclipStatus,
          geminiStatus: 'offline',
        });
        return {
          ...prev,
          isOnline: false,
          geminiStatus: 'offline',
          ...indicators,
        };
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 25 seconds
    const interval = setInterval(refresh, 25000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refresh]);

  return { ...state, refresh };
}
