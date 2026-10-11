'use client';

import React, { useEffect, useState } from 'react';
import { ModelTelemetry } from '@/src/types';
import { fetchModelStatus } from '@/src/lib/api';
import { useServiceConnectivity } from '@/src/lib/connectivity';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry?: ModelTelemetry | null;
  onRefresh?: () => void;
}

export default function SystemStatusModal({
  isOpen,
  onClose,
  telemetry: initialTelemetry,
  onRefresh,
}: SystemStatusModalProps) {
  const [telemetry, setTelemetry] = useState<ModelTelemetry | null>(initialTelemetry || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const connectivity = useServiceConnectivity();

  useEffect(() => {
    if (initialTelemetry) {
      setTelemetry(initialTelemetry);
    }
  }, [initialTelemetry]);

  useEffect(() => {
    if (isOpen) {
      handleRefresh();
    }
  }, [isOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      connectivity.refresh();
      const data = await fetchModelStatus();
      setTelemetry(data);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error refreshing telemetry:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isOpen) return null;

  const isReady = telemetry?.status === 'ready' || connectivity.bioclipStatus === 'ready';
  const visionModelId = telemetry?.vision_model_id || telemetry?.model_name || 'imageomics/bioclip-2';
  const visionLicense = telemetry?.vision_model_license || telemetry?.model_license || 'MIT';
  const visionDevice = (telemetry?.vision_device || telemetry?.device || 'cpu').toUpperCase();
  const visionMemMb = telemetry?.vision_memory_mb ?? telemetry?.memory_usage_mb;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-status-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#fbfdfa] text-[#19231c] rounded-2xl shadow-2xl border border-[#e2dec9] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4.5 bg-[#f0f7f1] border-b border-[#e2dec9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1b4332] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[19px]">developer_board</span>
            </div>
            <div>
              <h2 id="system-status-title" className="font-serif text-lg sm:text-xl font-bold text-[#1b4332]">
                System Architecture & Connectivity Telemetry
              </h2>
              <p className="text-[11px] sm:text-xs text-[#526354]">
                Hybrid Offline / Online Architecture: BioCLIP-2 + Server-managed Gemini API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close telemetry modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#526354] hover:text-[#1b4332] hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Status Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#e8f3ea] border border-[#c3dfc7]">
            <div className="flex items-center gap-2.5">
              <span className={`w-3 h-3 rounded-full ${connectivity.badgeDotClass}`} />
              <div className="flex flex-col">
                <span className="font-semibold text-[#1b4332]">
                  {connectivity.badgeText}
                </span>
                <span className="text-[11px] text-[#526354]">
                  {connectivity.statusDescription}
                </span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-white border border-[#c3dfc7] text-[#1b4332] hover:bg-[#d6ebd9] transition-colors disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[15px] ${isRefreshing ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
            </button>
          </div>

          {/* 4 Multi-State Diagnostic Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Internet Reachability */}
            <div className="p-2.5 rounded-lg bg-white border border-[#e2dec9] flex flex-col gap-1">
              <span className="text-[10px] text-[#526354] uppercase tracking-wider font-semibold">
                Internet
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${connectivity.isOnline ? 'bg-[#2e6b47]' : 'bg-zinc-400'}`} />
                <span className="font-semibold text-[#1b4332]">
                  {connectivity.isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>
            </div>

            {/* 2. Backend Service */}
            <div className="p-2.5 rounded-lg bg-white border border-[#e2dec9] flex flex-col gap-1">
              <span className="text-[10px] text-[#526354] uppercase tracking-wider font-semibold">
                FastAPI Backend
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${connectivity.backendConnected ? 'bg-[#2e6b47]' : 'bg-red-500'}`} />
                <span className="font-semibold text-[#1b4332] truncate">
                  {connectivity.backendConnected
                    ? connectivity.isLocalBackend ? 'Localhost (8000)' : 'Remote'
                    : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* 3. BioCLIP Vision AI */}
            <div className="p-2.5 rounded-lg bg-white border border-[#e2dec9] flex flex-col gap-1">
              <span className="text-[10px] text-[#526354] uppercase tracking-wider font-semibold">
                BioCLIP-2 AI
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  connectivity.bioclipStatus === 'ready'
                    ? 'bg-[#2e6b47]'
                    : connectivity.bioclipStatus === 'loading'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-zinc-400'
                }`} />
                <span className="font-semibold text-[#1b4332]">
                  {connectivity.bioclipStatus === 'ready' ? 'Ready' : connectivity.bioclipStatus}
                </span>
              </div>
            </div>

            {/* 4. Gemini API */}
            <div className="p-2.5 rounded-lg bg-white border border-[#e2dec9] flex flex-col gap-1">
              <span className="text-[10px] text-[#526354] uppercase tracking-wider font-semibold">
                Gemini Naturalist
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  connectivity.geminiStatus === 'ready'
                    ? 'bg-[#2e6b47]'
                    : connectivity.geminiStatus === 'offline'
                    ? 'bg-zinc-400'
                    : 'bg-amber-500'
                }`} />
                <span className="font-semibold text-[#1b4332] capitalize">
                  {connectivity.geminiStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Architecture Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vision Model Card (BioCLIP-2) */}
            <div className="flex flex-col p-4 rounded-xl bg-white border border-[#e2dec9] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#1b4332]/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2e6b47] bg-[#e8f3ea] px-2 py-0.5 rounded-md">
                  Vision Backbone
                </span>
                <span className="text-[10px] font-semibold text-[#526354] bg-[#f4f2ea] px-2 py-0.5 rounded">
                  License: {visionLicense}
                </span>
              </div>
              <h3 className="font-bold text-[#1b4332] text-base mb-1 font-mono break-all">
                {visionModelId}
              </h3>
              <p className="text-[11px] text-[#526354] mb-3">
                ViT-L/14 transformer trained on TreeOfLife-200M biological photos.
              </p>

              <div className="space-y-1.5 mt-auto pt-2 border-t border-[#f0ede1] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Architecture:</span>
                  <span className="font-semibold text-[#1b4332]">ViT-L/14 (768-dim)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Execution Device:</span>
                  <span className="font-semibold text-[#1b4332] font-mono">{visionDevice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Offline Capability:</span>
                  <span className="font-semibold text-[#1b4332]">
                    {connectivity.canPerformOfflineInference ? 'Supported (Local Engine)' : 'Requires Active Backend'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Memory Footprint:</span>
                  <span className="font-semibold text-[#1b4332]">
                    {visionMemMb ? `${visionMemMb} MB` : '~1.7 GB (Weights)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Gemini Cloud Naturalist Card */}
            <div className="flex flex-col p-4 rounded-xl bg-white border border-[#e2dec9] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#0d6efd]/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d6efd] bg-[#e7f1ff] px-2 py-0.5 rounded-md">
                  Cloud Assistant
                </span>
                <span className="text-[10px] font-semibold text-[#526354] bg-[#f4f2ea] px-2 py-0.5 rounded">
                  Server-Managed Key
                </span>
              </div>
              <h3 className="font-bold text-[#1b4332] text-base mb-1 font-mono">
                Google Gemini API
              </h3>
              <p className="text-[11px] text-[#526354] mb-3">
                Optional natural history synthesis and interactive Q&A. GEMINI_API_KEY is kept strictly on the backend.
              </p>

              <div className="space-y-1.5 mt-auto pt-2 border-t border-[#f0ede1] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Model ID:</span>
                  <span className="font-semibold text-[#1b4332] font-mono">
                    {connectivity.geminiModel || 'gemini-2.5-flash'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Status:</span>
                  <span className="font-semibold text-[#1b4332] capitalize">
                    {connectivity.geminiStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Privacy Control:</span>
                  <span className="font-semibold text-[#2e6b47]">Explicit Opt-In Only</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Key Storage:</span>
                  <span className="font-semibold text-[#1b4332]">Backend .env Only (Never Exposed)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Guarantees & Honest Offline Policy */}
          <div className="p-4 rounded-xl bg-[#f8f6f0] border border-[#e2dec9] space-y-2 text-xs">
            <div className="font-semibold text-[#1b4332] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#2e6b47]">security</span>
              <span>Offline Architecture & Privacy Guarantees</span>
            </div>
            <ul className="space-y-1.5 text-[#526354] list-disc list-inside">
              <li>
                <strong className="text-[#19231c]">Persistent Field Journal:</strong> All entries and notes are stored persistently in browser IndexedDB and accessible offline.
              </li>
              <li>
                <strong className="text-[#19231c]">Cached Taxonomy (36 Taxa):</strong> Reference species database with diagnostic traits and habitat notes is cached locally in browser storage.
              </li>
              <li>
                <strong className="text-[#19231c]">Honest AI Inference:</strong> BioCLIP-2 vision runs offline only when a local backend is active on 127.0.0.1. Remote backend setups require network reachability and are labeled as "Remote AI Online".
              </li>
              <li>
                <strong className="text-[#19231c]">Zero Silent Image Uploads:</strong> Photos are never uploaded to Gemini or third parties without explicit, conscious user consent toggle.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-3.5 bg-[#f0f7f1] border-t border-[#e2dec9] flex items-center justify-between text-xs">
          <span className="text-[#526354]">
            WildLens AI · Hybrid Online & Offline Architecture
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1b4332] text-white font-semibold hover:bg-[#2d6a4f] transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
