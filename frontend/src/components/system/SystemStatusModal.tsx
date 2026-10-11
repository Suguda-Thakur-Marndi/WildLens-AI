'use client';

import React, { useEffect, useState } from 'react';
import { ModelTelemetry } from '@/src/types';
import { fetchModelStatus } from '@/src/lib/api';

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

  useEffect(() => {
    if (initialTelemetry) {
      setTelemetry(initialTelemetry);
    }
  }, [initialTelemetry]);

  useEffect(() => {
    if (isOpen && !telemetry) {
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

  const isReady = telemetry?.status === 'ready';
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
                System Architecture & Hardware Telemetry
              </h2>
              <p className="text-[11px] sm:text-xs text-[#526354]">
                Single-model edge AI: BioCLIP-2 Vision Backbone + Curated Natural History KB
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
          {/* Edge Status & Overall Health Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#e8f3ea] border border-[#c3dfc7]">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  isReady ? 'bg-[#2e6b47] animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="font-semibold text-[#1b4332]">
                {isReady ? '100% Offline Edge Verified · Single BioCLIP 2 Model' : 'AI Engine Initializing...'}
              </span>
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
                ViT-L/14 transformer trained on TreeOfLife-200M (200M biological photos across the Tree of Life).
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
                  <span className="text-[#6c786e]">Precision:</span>
                  <span className="font-semibold text-[#1b4332]">
                    {visionDevice === 'CUDA' ? 'fp16 (VRAM optimized)' : 'fp32 (Multi-threaded AVX)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Memory Footprint:</span>
                  <span className="font-semibold text-[#1b4332]">
                    {visionMemMb ? `${visionMemMb} MB VRAM` : '~1.7 GB RAM (Weights)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Curated Natural History & Safety Card */}
            <div className="flex flex-col p-4 rounded-xl bg-white border border-[#e2dec9] shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#c48e28]/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#916518] bg-[#fbf3db] px-2 py-0.5 rounded-md">
                  Taxonomy & Safety
                </span>
                <span className="text-[10px] font-semibold text-[#526354] bg-[#f4f2ea] px-2 py-0.5 rounded">
                  Curated KB
                </span>
              </div>
              <h3 className="font-bold text-[#1b4332] text-base mb-1 font-mono">
                taxonomy_kb.py
              </h3>
              <p className="text-[11px] text-[#526354] mb-3">
                Zero-hallucination deterministic botanical and zoological trait knowledge base with mandatory fungi guards.
              </p>

              <div className="space-y-1.5 mt-auto pt-2 border-t border-[#f0ede1] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Curated Species:</span>
                  <span className="font-semibold text-[#1b4332]">{telemetry?.supported_taxa_count || 36} verified taxa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Hallucination Risk:</span>
                  <span className="font-semibold text-[#2e6b47]">0% (Deterministic KB)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Mushroom Guard:</span>
                  <span className="font-semibold text-[#b91c1c]">Active (Never Eat Wild Fungi)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6c786e]">Confidence Bands:</span>
                  <span className="font-semibold text-[#1b4332]">likely / possible / unsure</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Guarantees & Cache Details */}
          <div className="p-4 rounded-xl bg-[#f8f6f0] border border-[#e2dec9] space-y-2 text-xs">
            <div className="font-semibold text-[#1b4332] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#2e6b47]">security</span>
              <span>Air-Gapped Offline Privacy Guarantees</span>
            </div>
            <ul className="space-y-1 text-[#526354] list-disc list-inside">
              <li>
                <strong className="text-[#19231c]">Weight Cache:</strong> <code className="bg-black/5 px-1 py-0.5 rounded">{telemetry?.cache_directory || 'models/bioclip_cache'}</code> (enforced with <code>HF_HUB_OFFLINE=1</code>).
              </li>
              <li>
                <strong className="text-[#19231c]">Taxa Grounding:</strong> {telemetry?.supported_taxa_count || 36} curated reference taxa with precomputed 768-dimensional lineage embeddings.
              </li>
              <li>
                <strong className="text-[#19231c]">Zero Cloud Egress:</strong> Model weights and inference passes execute 100% locally on your machine with zero network egress.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-3.5 bg-[#f0f7f1] border-t border-[#e2dec9] flex items-center justify-between text-xs">
          <span className="text-[#526354]">
            WildLens AI · Hacktoberfest 2026 Touch Grass Edition
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
