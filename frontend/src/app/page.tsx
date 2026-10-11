'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  identifyImageFile,
  fetchModelStatus,
  WildLensApiError,
  getApiBaseUrl,
  setStoredApiUrl,
  getStoredApiUrl,
  testBackendConnection
} from '@/src/lib/api';
import { IdentificationResult, ModelTelemetry } from '@/src/types';
import { PRESET_TEST_SPECIMENS } from '@/src/lib/sampleData';

type FieldModeStep = 'camera' | 'analyzing' | 'glance' | 'lookup';

interface IdentificationErrorState {
  title: string;
  message: string;
  type: string;
  canRetry: boolean;
  technicalDetails?: string;
  file?: File;
  previewUrl?: string;
}

const SENSORY_PROMPTS = [
  'Look up at the canopy or horizon. Take three deep breaths and feel the wind on your face.',
  'Close your eyes for 30 seconds. Listen closely: how many distinct bird calls or leaf rustles can you separate?',
  'Notice the soil, bark, or stone beneath your feet. What colors and textures exist without a screen?',
  'Look at the light filtering through the branches. Observe how shadows shift with the breeze.',
];

export default function FieldModeLandingPage() {
  const [step, setStep] = useState<FieldModeStep>('camera');
  const [menuOpen, setMenuOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [identificationError, setIdentificationError] = useState<IdentificationErrorState | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [sensoryPrompt, setSensoryPrompt] = useState(SENSORY_PROMPTS[0]);
  const [telemetry, setTelemetry] = useState<ModelTelemetry | null>(null);

  useEffect(() => {
    fetchModelStatus().then(setTelemetry).catch(() => {});
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Track stop error:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      stopCamera();
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API unavailable. You can use image upload below.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraActive(true);
        }
      } catch (err: any) {
        console.warn('Camera start error:', err);
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission denied. Use file upload or enable camera in browser settings.'
            : 'Unable to access camera. Use file upload below.'
        );
      }
    },
    [facingMode, stopCamera]
  );

  // Initialize camera when entering camera step
  useEffect(() => {
    if (step === 'camera') {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step, facingMode, startCamera, stopCamera]);

  // Handle 60s Look Up Screen Timer
  useEffect(() => {
    if (step !== 'lookup') return;

    setTimerSeconds(60);
    // Pick a random sensory prompt
    const randomPrompt = SENSORY_PROMPTS[Math.floor(Math.random() * SENSORY_PROMPTS.length)];
    setSensoryPrompt(randomPrompt);

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleReturnToCamera();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Capture frame from live video
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'field_capture.jpg', { type: 'image/jpeg' });
        const preview = URL.createObjectURL(blob);
        setCapturedImage(preview);
        await processIdentification(file, preview);
      },
      'image/jpeg',
      0.9
    );
  };

  // Process identification with BioCLIP-2
  const processIdentification = async (file: File, previewUrl: string) => {
    setStep('analyzing');
    setIdentificationError(null);
    try {
      const res = await identifyImageFile(file);
      if (!res.image_url || res.image_url.startsWith('blob:')) {
        res.image_url = previewUrl;
      }
      setResult(res);
      setStep('glance');
    } catch (err: any) {
      console.warn('Identification error:', err);
      const isApiErr = err instanceof WildLensApiError;
      const errorType = isApiErr ? err.errorType : 'network_error';

      let title = 'Identification Failed';
      if (errorType === 'static_host_405') {
        title = 'Method Not Allowed (HTTP 405)';
      } else if (errorType === 'unconfigured_backend') {
        title = 'FastAPI Backend Required';
      } else if (errorType === 'cold_start_or_server_error') {
        title = 'Backend Starting Up';
      } else if (errorType === 'not_found_404') {
        title = 'API Endpoint Not Found';
      } else if (errorType === 'validation_error') {
        title = 'Image Validation Notice';
      } else if (errorType === 'network_error') {
        title = 'Connection Unreachable';
      }

      setIdentificationError({
        title,
        message:
          err.userMessage ||
          err.message ||
          'Identification failed. Please verify that the backend is connected and try again.',
        type: errorType,
        canRetry: err.canRetry ?? true,
        technicalDetails: err.technicalDetails,
        file,
        previewUrl,
      });
      setStep('camera');
    }
  };

  // Handle file upload fallback
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setCapturedImage(preview);
    await processIdentification(file, preview);
  };

  // Handle sample specimen preset click
  const handleSampleSelect = async (specimen: typeof PRESET_TEST_SPECIMENS[0]) => {
    setCapturedImage(specimen.image_url);
    try {
      const resp = await fetch(specimen.image_url);
      const blob = await resp.blob();
      const file = new File([blob], specimen.file, { type: 'image/jpeg' });
      await processIdentification(file, specimen.image_url);
    } catch {
      // Fallback dummy file
      const file = new File([], specimen.file, { type: 'image/jpeg' });
      await processIdentification(file, specimen.image_url);
    }
  };

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleReturnToCamera = () => {
    setResult(null);
    setCapturedImage(null);
    setStep('camera');
  };

  // Determine Confidence Band
  const getConfidenceBand = (res: IdentificationResult | null) => {
    if (!res) return { label: 'Unsure', color: 'bg-zinc-700 text-zinc-100 border-zinc-500' };
    const conf = res.top_candidate?.confidence ?? 0;
    const status = res.confidence_status;

    if (status === 'confident' || conf >= 0.7) {
      return { label: 'Likely', color: 'bg-[#1b4332] text-[#8fc0a9] border-[#2e6b47]' };
    }
    if (status === 'moderate' || conf >= 0.4) {
      return { label: 'Possible', color: 'bg-[#43321b] text-[#fcd34d] border-[#855e1b]' };
    }
    return { label: 'Unsure', color: 'bg-zinc-800 text-zinc-300 border-zinc-600' };
  };

  // One-line trait
  const getOneLineTrait = (res: IdentificationResult | null) => {
    if (!res) return 'Not sure. Check leaf edges, bark, habitat, and markings.';
    const traits = res.top_candidate?.distinguishing_features || res.distinguishing_features;
    if (traits && traits.length > 0 && traits[0].trim()) {
      return traits[0];
    }
    if (res.top_candidate?.field_verification_tip) {
      return res.top_candidate.field_verification_tip;
    }
    return 'Not sure. Check leaf edges, bark, habitat, and markings.';
  };

  // Check if Fungi
  const isFungi = (res: IdentificationResult | null) => {
    if (!res) return false;
    const kingdom = (res.top_candidate?.kingdom || '').toLowerCase();
    const common = (res.top_candidate?.common_name || '').toLowerCase();
    const scientific = (res.top_candidate?.scientific_name || '').toLowerCase();
    return (
      kingdom.includes('fungi') ||
      common.includes('mushroom') ||
      common.includes('agaric') ||
      common.includes('chanterelle') ||
      common.includes('fungus') ||
      scientific.includes('amanita')
    );
  };

  // -------------------------------------------------------------
  // RENDER STEP 1: "NOW LOOK UP" SCREEN (Dims to near-black)
  // -------------------------------------------------------------
  if (step === 'lookup') {
    return (
      <div
        onClick={handleReturnToCamera}
        className="fixed inset-0 z-50 bg-[#050805] text-[#e0efe2] flex flex-col items-center justify-between p-6 sm:p-10 select-none cursor-pointer transition-colors duration-1000"
      >
        {/* Subtle Top Dismiss Hint */}
        <div className="w-full max-w-md flex justify-between items-center text-xs tracking-widest text-[#526a56] uppercase">
          <span>Look Up Screen</span>
          <span>Tap anywhere to exit</span>
        </div>

        {/* Central Mindful Prompt */}
        <div className="w-full max-w-lg my-auto text-center space-y-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-[#122316] border border-[#234b2a] flex items-center justify-center text-[#8fc0a9] shadow-inner">
            <span className="material-symbols-outlined text-3xl sm:text-4xl animate-pulse">
              visibility
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif text-2xl sm:text-3xl text-[#d4ead6] font-bold tracking-tight">
              Now Look Up.
            </h2>
            <p className="font-serif italic text-base sm:text-lg text-[#9cbba0] leading-relaxed max-w-md mx-auto">
              “{sensoryPrompt}”
            </p>
          </div>

          {/* 60s Countdown Display */}
          <div className="flex flex-col items-center justify-center gap-2 pt-4">
            <span className="font-mono text-5xl sm:text-6xl font-bold tracking-wider text-[#8fc0a9]">
              00:{timerSeconds < 10 ? `0${timerSeconds}` : timerSeconds}
            </span>
            <span className="text-xs text-[#526a56] uppercase tracking-wider">
              Screen dims to near-black · Breathing pause
            </span>
          </div>
        </div>

        {/* Large Glove-Friendly Tap Area Hint */}
        <div className="w-full max-w-md text-center py-4 border-t border-[#122316]">
          <button
            onClick={handleReturnToCamera}
            className="w-full py-4 rounded-xl bg-[#122316] hover:bg-[#1b3821] text-[#8fc0a9] font-bold text-sm border border-[#234b2a] transition-colors"
          >
            Done Looking · Return to Camera
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STEP 2: GLANCEABLE RESULT
  // -------------------------------------------------------------
  if (step === 'glance') {
    const band = getConfidenceBand(result);
    const trait = getOneLineTrait(result);
    const fungiWarning = isFungi(result);

    return (
      <div className="min-h-screen bg-[#08120a] text-[#f4fff4] flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none">
        {/* Top Header */}
        <div className="w-full max-w-lg mx-auto flex items-center justify-between border-b border-[#1b3821] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8fc0a9]" />
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8fc0a9]">
              Field Observation · In Situ
            </span>
          </div>
          <button
            onClick={handleReturnToCamera}
            className="px-3 py-1.5 rounded-lg bg-[#122316] text-[#8fc0a9] text-xs font-bold border border-[#234b2a] hover:bg-[#1b3821]"
          >
            Retake
          </button>
        </div>

        {/* Main Glanceable Specimen Card */}
        <div className="w-full max-w-lg mx-auto my-auto flex flex-col gap-4 py-4">
          {/* Specimen Visual & Core Identity */}
          <div className="flex items-center gap-4 bg-[#0d1a10] p-4 rounded-2xl border-2 border-[#234b2a] shadow-lg">
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured specimen"
                loading="lazy"
                decoding="async"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-[#8fc0a9] flex-shrink-0"
              />
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${band.color}`}
                >
                  {band.label}
                </span>
                <span className="text-[11px] text-[#8fc0a9] font-mono">
                  {result?.similarity_score
                    ? `cos ${(result.similarity_score).toFixed(2)}`
                    : `${Math.round((result?.top_candidate?.confidence || 0) * 100)}%`}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#f4fff4] leading-tight truncate">
                {result?.top_candidate?.common_name || 'Unidentified Specimen'}
              </h1>
              <p className="text-xs sm:text-sm italic text-[#8fc0a9] font-serif truncate">
                {result?.top_candidate?.scientific_name || 'Incerta sedis'}
              </p>
            </div>
          </div>

          {/* Mandatory Fungi Safety Guard Banner */}
          {fungiWarning && (
            <div className="bg-[#2d0f0f] border-2 border-[#b91c1c] text-[#fca5a5] p-3.5 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-[#ef4444] text-xl flex-shrink-0 mt-0.5">
                warning
              </span>
              <div className="text-xs sm:text-sm leading-snug">
                <strong className="block font-bold text-[#fecaca] uppercase tracking-wide">
                  Mushroom Safety Notice
                </strong>
                Never consume wild mushrooms based on this app. Even experienced mycologists require spore prints and microscopy.
              </div>
            </div>
          )}

          {/* Curated Diagnostic Trait (1-Line glance) */}
          <div className="bg-[#122316] p-4 rounded-xl border-l-4 border-[#8fc0a9]">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8fc0a9] block mb-1">
              Curated Diagnostic Feature
            </span>
            <p className="text-sm sm:text-base text-[#e0efe2] font-medium leading-snug">
              {trait}
            </p>
          </div>

          {/* Outdoor Notice */}
          <div className="text-center text-xs text-[#628169] py-1">
            Zero cloud egress · BioCLIP 2 ViT-L/14 on TreeOfLife-200M
          </div>
        </div>

        {/* Large Glove-Friendly Actions */}
        <div className="w-full max-w-lg mx-auto flex flex-col gap-3 pb-2">
          {/* Primary Action: Touch Grass / Look Up Screen */}
          <button
            onClick={() => setStep('lookup')}
            className="w-full py-4 sm:py-4.5 rounded-xl bg-[#2e6b47] hover:bg-[#398257] active:scale-[0.99] text-[#f4fff4] font-serif font-bold text-base sm:text-lg flex items-center justify-center gap-2 border border-[#439665] shadow-lg transition-transform"
          >
            <span className="material-symbols-outlined text-2xl">visibility</span>
            <span>NOW LOOK UP (60s Screen Break)</span>
          </button>

          {/* Secondary Action: Return to Camera */}
          <button
            onClick={handleReturnToCamera}
            className="w-full py-3.5 rounded-xl bg-[#122316] hover:bg-[#1a3521] text-[#a0c2a8] font-bold text-sm border border-[#234b2a] transition-colors"
          >
            Take Another Photo
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STEP 3: ANALYZING STATE
  // -------------------------------------------------------------
  if (step === 'analyzing') {
    return (
      <div className="min-h-screen bg-[#08120a] text-[#f4fff4] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-[#122316] border-2 border-[#8fc0a9] flex items-center justify-center animate-spin mb-4">
          <span className="material-symbols-outlined text-3xl text-[#8fc0a9]">
            filter_vintage
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#d4ead6] mb-1">
          Identifying Specimen...
        </h2>
        <p className="text-xs text-[#8fc0a9] max-w-xs leading-relaxed">
          BioCLIP 2 local edge inference across Tree of Life candidate taxonomy.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER STEP 4: DEFAULT CAMERA VIEW (TOUCH GRASS FIELD MODE)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#08120a] text-[#f4fff4] flex flex-col justify-between relative overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Utility Header */}
      <header className="relative z-20 w-full bg-[#08120a]/80 backdrop-blur-md border-b border-[#1b3821] px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {/* Menu Drawer Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open menu"
            className="w-10 h-10 rounded-xl bg-[#122316] border border-[#234b2a] flex items-center justify-center text-[#8fc0a9] hover:bg-[#1b3821] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>

          {/* Field Mode & AI Readiness Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                telemetry?.status === 'ready'
                  ? 'bg-[#8fc0a9]'
                  : telemetry?.status === 'loading'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-zinc-500'
              }`}
            />
            <span className="font-serif font-bold text-sm sm:text-base text-[#f4fff4] tracking-wide">
              WildLens AI
            </span>
            <span
              className={`text-[10px] font-mono uppercase border px-2 py-0.5 rounded ${
                telemetry?.status === 'ready'
                  ? 'bg-[#122316] border-[#234b2a] text-[#8fc0a9]'
                  : telemetry?.status === 'loading'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400'
              }`}
            >
              {telemetry?.status === 'ready'
                ? 'AI Ready'
                : telemetry?.status === 'loading'
                ? 'Loading AI'
                : 'App Ready'}
            </span>
          </div>

          {/* Camera Flip Button */}
          <button
            onClick={handleFlipCamera}
            aria-label="Flip camera"
            className="w-10 h-10 rounded-xl bg-[#122316] border border-[#234b2a] flex items-center justify-center text-[#8fc0a9] hover:bg-[#1b3821] active:scale-95 transition-all"
            title="Switch front / rear camera"
          >
            <span className="material-symbols-outlined text-2xl">flip_camera_ios</span>
          </button>
        </div>
      </header>

      {/* Slide-out Secondary Menu Drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] bg-[#0c180e] border-r border-[#1b3821] h-full p-5 flex flex-col justify-between shadow-2xl animate-slideRight"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#1b3821]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8fc0a9]">eco</span>
                  <span className="font-serif font-bold text-[#f4fff4] text-base">WildLens AI</span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-lg text-[#8fc0a9] hover:bg-[#122316] flex items-center justify-center"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <nav className="flex flex-col gap-2 text-sm font-medium">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setStep('camera');
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#1b3821] text-[#f4fff4] text-left font-bold"
                >
                  <span className="material-symbols-outlined text-[#8fc0a9]">photo_camera</span>
                  <span>Field Mode (Camera)</span>
                </button>

                <Link
                  href="/journal"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#122316] text-[#b3ceb8] transition-colors"
                >
                  <span className="material-symbols-outlined text-[#8fc0a9]">menu_book</span>
                  <span>Field Journal</span>
                </Link>

                <Link
                  href="/missions"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#122316] text-[#b3ceb8] transition-colors"
                >
                  <span className="material-symbols-outlined text-[#8fc0a9]">explore</span>
                  <span>Field Missions</span>
                </Link>

                <Link
                  href="/identify"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#122316] text-[#b3ceb8] transition-colors"
                >
                  <span className="material-symbols-outlined text-[#8fc0a9]">center_focus_strong</span>
                  <span>Optical Loupe Dossier</span>
                </Link>

                <Link
                  href="/settings"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#122316] text-[#b3ceb8] transition-colors"
                >
                  <span className="material-symbols-outlined text-[#8fc0a9]">settings</span>
                  <span>Telemetry & Settings</span>
                </Link>
              </nav>
            </div>

            <div className="pt-4 border-t border-[#1b3821] text-xs text-[#526a56] space-y-1">
              <div>Touch Grass Edition · 100% Offline</div>
              <div>Single BioCLIP 2 Vision Engine</div>
            </div>
          </div>
        </div>
      )}

      {/* Center Viewfinder / Fallback View */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Inline Error Card with Retry & Diagnostics */}
        {identificationError && (
          <div className="absolute top-4 left-4 right-4 z-30 max-w-md mx-auto bg-[#1a0e0e]/95 backdrop-blur-md border-2 border-[#b91c1c] text-[#fecaca] p-4 rounded-2xl shadow-2xl flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-2xl text-[#ef4444] flex-shrink-0 mt-0.5">
                {identificationError.type === 'static_host_405'
                  ? 'cloud_off'
                  : identificationError.type === 'cold_start_or_server_error'
                  ? 'hourglass_top'
                  : identificationError.type === 'unconfigured_backend'
                  ? 'dns'
                  : 'warning'}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="font-serif font-bold text-sm sm:text-base text-[#fee2e2] leading-snug">
                  {identificationError.title}
                </h4>
                <p className="text-xs text-[#fca5a5] mt-1 leading-relaxed">
                  {identificationError.message}
                </p>
              </div>
              <button
                onClick={() => setIdentificationError(null)}
                aria-label="Dismiss error"
                className="w-7 h-7 rounded-lg text-[#fca5a5] hover:text-white hover:bg-white/10 flex items-center justify-center flex-shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#4a1c1c]">
              {identificationError.canRetry && identificationError.file && (
                <button
                  onClick={() => {
                    const f = identificationError.file!;
                    const p = identificationError.previewUrl!;
                    setIdentificationError(null);
                    processIdentification(f, p);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span>Retry Identification</span>
                </button>
              )}

              {(identificationError.type === 'unconfigured_backend' ||
                identificationError.type === 'static_host_405' ||
                identificationError.type === 'network_error') && (
                <>
                  <Link
                    href="/settings"
                    className="px-3 py-1.5 rounded-xl bg-[#2e6b47] hover:bg-[#398257] text-[#f4fff4] text-xs font-bold flex items-center gap-1.5 transition-colors border border-[#439665]"
                  >
                    <span className="material-symbols-outlined text-[16px]">tune</span>
                    <span>Backend Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIdentificationError(null);
                      handleSampleSelect(PRESET_TEST_SPECIMENS[0]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#122316] text-[#8fc0a9] hover:bg-[#1b3821] text-xs font-bold border border-[#234b2a]"
                  >
                    <span>Try Sample Specimen</span>
                  </button>
                </>
              )}
            </div>

            {/* Collapsible Technical Details */}
            {identificationError.technicalDetails && (
              <details className="text-[11px] text-[#f87171] bg-black/30 rounded-lg p-2 border border-red-900/50">
                <summary className="cursor-pointer font-mono font-semibold select-none">
                  Technical Details
                </summary>
                <p className="mt-1 font-mono text-[10px] break-all">
                  {identificationError.technicalDetails}
                </p>
              </details>
            )}
          </div>
        )}

        {/* Live Video Camera Stream */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Viewfinder Reticle Overlay */}
        {cameraActive && (
          <div className="relative z-10 pointer-events-none w-64 h-64 sm:w-72 sm:h-72 border-2 border-[#8fc0a9]/40 rounded-3xl flex items-center justify-center">
            <div className="w-4 h-4 border-t-2 border-l-2 border-[#8fc0a9] absolute top-2 left-2" />
            <div className="w-4 h-4 border-t-2 border-r-2 border-[#8fc0a9] absolute top-2 right-2" />
            <div className="w-4 h-4 border-b-2 border-l-2 border-[#8fc0a9] absolute bottom-2 left-2" />
            <div className="w-4 h-4 border-b-2 border-r-2 border-[#8fc0a9] absolute bottom-2 right-2" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#8fc0a9]/70 bg-black/40 px-2 py-0.5 rounded">
              Align Specimen
            </span>
          </div>
        )}

        {/* Fallback Screen when Camera is inactive / denied */}
        {!cameraActive && (
          <div className="relative z-10 max-w-sm mx-auto p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#122316] border border-[#234b2a] flex items-center justify-center text-[#8fc0a9]">
              <span className="material-symbols-outlined text-3xl">photo_camera</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-[#f4fff4]">
                Outdoor Field Camera
              </h3>
              <p className="text-xs text-[#8fc0a9] leading-relaxed">
                {cameraError || 'Allow camera permissions or choose a photo below for zero-cloud identification.'}
              </p>
            </div>

            <button
              onClick={() => startCamera(facingMode)}
              className="px-4 py-2.5 rounded-xl bg-[#2e6b47] hover:bg-[#398257] text-[#f4fff4] font-bold text-xs border border-[#439665]"
            >
              Retry Camera
            </button>
          </div>
        )}
      </main>

      {/* Bottom Controls Bar (Glove-Friendly) */}
      <footer className="relative z-20 w-full bg-[#08120a]/90 backdrop-blur-md border-t border-[#1b3821] p-4 sm:p-5">
        <div className="max-w-xl mx-auto flex flex-col gap-3">
          {/* Quick Preset Specimens for Offline Testing */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] uppercase tracking-wider text-[#526a56] font-bold flex-shrink-0">
              Test Presets:
            </span>
            {PRESET_TEST_SPECIMENS.slice(0, 3).map((specimen, idx) => (
              <button
                key={idx}
                onClick={() => handleSampleSelect(specimen)}
                className="px-2.5 py-1 rounded-lg bg-[#122316] hover:bg-[#1c3822] text-[#8fc0a9] border border-[#234b2a] text-[11px] whitespace-nowrap"
              >
                {specimen.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Main Glove-Friendly Action Row */}
          <div className="flex items-center justify-around gap-4 pt-1">
            {/* Upload File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 rounded-2xl bg-[#122316] border border-[#234b2a] text-[#8fc0a9] hover:bg-[#1b3821] active:scale-95 flex items-center justify-center transition-all"
              title="Upload photo from device"
              aria-label="Upload photo"
            >
              <span className="material-symbols-outlined text-2xl">photo_library</span>
            </button>

            {/* Giant Shutter Button (>= 76px, high-contrast, glove-friendly) */}
            <button
              onClick={handleCapture}
              disabled={!cameraActive}
              className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full border-4 flex items-center justify-center transition-all ${
                cameraActive
                  ? 'border-[#8fc0a9] bg-[#2e6b47] hover:bg-[#388156] active:scale-95 shadow-xl cursor-pointer'
                  : 'border-[#234b2a] bg-[#122316] opacity-50 cursor-not-allowed'
              }`}
              aria-label="Capture specimen image"
            >
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-[#1b4332]">
                <span className="material-symbols-outlined text-3xl">center_focus_strong</span>
              </div>
            </button>

            {/* Settings Quick Access */}
            <Link
              href="/settings"
              className="w-14 h-14 rounded-2xl bg-[#122316] border border-[#234b2a] text-[#8fc0a9] hover:bg-[#1b3821] active:scale-95 flex items-center justify-center transition-all"
              title="Settings & Telemetry"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-2xl">settings</span>
            </Link>
          </div>
        </div>
      </footer>


    </div>
  );
}

function ApiConfigModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customUrl, setCustomUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomUrl(getStoredApiUrl() || getApiBaseUrl() || '');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!customUrl.trim()) {
      setTestResult({ ok: false, message: 'Please enter a URL to test.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const res = await testBackendConnection(customUrl.trim());
    setTesting(false);
    if (res.ok) {
      setTestResult({
        ok: true,
        message: `Connected successfully! Response time: ${res.latencyMs}ms. Status: ${res.data?.status || 'healthy'}.`,
      });
    } else {
      setTestResult({
        ok: false,
        message: `Connection failed (${res.error || 'Network error'}). Ensure backend is running and allows CORS.`,
      });
    }
  };

  const handleSave = () => {
    setStoredApiUrl(customUrl.trim() || null);
    onSaved();
    onClose();
  };

  const handleClear = () => {
    setStoredApiUrl(null);
    setCustomUrl('');
    onSaved();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[#0c180e] border border-[#234b2a] text-[#f4fff4] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1b3821]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8fc0a9]">tune</span>
            <h3 className="font-serif font-bold text-base text-[#d4ead6]">
              FastAPI Backend Server URL
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close configuration"
            className="w-7 h-7 rounded-lg text-[#8fc0a9] hover:bg-[#122316] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <p className="text-xs text-[#a0c2a8] leading-relaxed">
          WildLens AI is hosted on GitHub Pages (static hosting). Live BioCLIP-2 vision AI inference runs on an external FastAPI server. Enter your deployed backend URL below.
        </p>

        <div className="space-y-1.5">
          <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#8fc0a9]">
            Backend Base URL
          </label>
          <input
            type="url"
            placeholder="https://your-fastapi-backend.onrender.com"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#122316] border border-[#234b2a] text-[#f4fff4] placeholder:text-[#526a56] text-xs font-mono focus:outline-none focus:border-[#8fc0a9]"
          />
          <span className="text-[10px] text-[#526a56] block">
            Example: https://wildlens-ai.onrender.com or http://192.168.1.100:8000
          </span>
        </div>

        {testResult && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium border flex items-start gap-2 ${
              testResult.ok
                ? 'bg-[#1b4332]/50 border-[#2e6b47] text-[#a7f3d0]'
                : 'bg-[#450a0a]/50 border-[#991b1b] text-[#fca5a5]'
            }`}
          >
            <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">
              {testResult.ok ? 'check_circle' : 'error'}
            </span>
            <span className="leading-snug">{testResult.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1b3821]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-1.5 rounded-lg bg-[#122316] hover:bg-[#1b3821] text-[#8fc0a9] text-xs font-bold border border-[#234b2a] transition-colors disabled:opacity-50"
            >
              {testing ? 'Pinging...' : 'Test Connection'}
            </button>
            <button
              onClick={handleClear}
              className="px-2.5 py-1.5 rounded-lg text-xs text-[#f87171] hover:bg-red-950/30 transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-[#122316] text-xs font-medium text-[#a0c2a8]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-[#2e6b47] hover:bg-[#398257] text-[#f4fff4] text-xs font-bold shadow-md transition-colors"
            >
              Save URL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
