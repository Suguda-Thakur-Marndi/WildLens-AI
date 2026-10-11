'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/src/components/Header';
import BottomNav from '@/src/components/BottomNav';
import {
  fetchModelStatus,
  getApiBaseUrl,
  getStoredApiUrl,
  setStoredApiUrl,
  testBackendConnection
} from '@/src/lib/api';
import { journalDb } from '@/src/lib/journalDb';
import { ModelTelemetry } from '@/src/types';
import SystemStatusModal from '@/src/components/system/SystemStatusModal';

export default function SettingsPage() {
  const [telemetry, setTelemetry] = useState<ModelTelemetry | null>(null);
  const [obsCount, setObsCount] = useState<number>(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [_loading, setLoading] = useState(true);

  // Backend API URL configuration state
  const [backendUrlInput, setBackendUrlInput] = useState('');
  const [testingBackend, setTestingBackend] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadSettingsData = async () => {
    setLoading(true);
    setBackendUrlInput(getStoredApiUrl() || getApiBaseUrl() || '');
    try {
      const [statusData, obs] = await Promise.all([
        fetchModelStatus(),
        journalDb.getAll(),
      ]);
      setTelemetry(statusData);
      setObsCount(obs.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleTestBackend = async () => {
    if (!backendUrlInput.trim()) {
      setTestResult({ ok: false, message: 'Please enter a backend URL to test.' });
      return;
    }
    setTestingBackend(true);
    setTestResult(null);
    const result = await testBackendConnection(backendUrlInput.trim());
    setTestingBackend(false);
    if (result.ok) {
      setTestResult({
        ok: true,
        message: `Connected! Server healthy (latency: ${result.latencyMs}ms, version: ${result.data?.version || '1.0.0'}).`,
      });
      showToast('FastAPI backend connection verified!');
    } else {
      setTestResult({
        ok: false,
        message: `Failed to connect (${result.error || 'Network error'}). Ensure backend is running and CORS is configured.`,
      });
    }
  };

  const handleSaveBackendUrl = () => {
    const trimmed = backendUrlInput.trim();
    setStoredApiUrl(trimmed || null);
    showToast(trimmed ? 'Custom backend API URL saved.' : 'Backend URL reset to default.');
    loadSettingsData();
  };

  const handleResetBackendUrl = () => {
    setStoredApiUrl(null);
    setBackendUrlInput(getApiBaseUrl() || '');
    setTestResult(null);
    showToast('Reset to default API configuration.');
    loadSettingsData();
  };

  const handleExportJournal = async () => {
    const jsonStr = await journalDb.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildlens_journal_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Field Journal exported successfully.');
  };

  const handleClearJournal = async () => {
    await journalDb.clear();
    setObsCount(0);
    setShowClearConfirm(false);
    showToast('Local journal records cleared.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const statusBadge = () => {
    if (!telemetry) return { label: 'Checking...', color: 'bg-surface-container text-on-surface-variant' };
    switch (telemetry.status) {
      case 'ready':
        return { label: 'Ready · Offline Active', color: 'bg-[#2e6b47] text-white' };
      case 'loading':
        return { label: 'Loading Model Weights...', color: 'bg-[#c48e28] text-white' };
      case 'unavailable':
        return { label: 'Model Unavailable', color: 'bg-[#b8473d] text-white' };
      case 'error':
        return { label: 'Engine Error', color: 'bg-error text-white' };
      default:
        return { label: 'Standby', color: 'bg-surface-container text-on-surface-variant' };
    }
  };

  const badge = statusBadge();

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col pb-20 lg:pb-0">
      <Header />

      <main className="w-full pt-20 flex-1">
        <div className="max-w-[800px] mx-auto px-4 md:px-6 lg:px-8 py-8 lg:py-12 flex flex-col gap-8">
          {/* Section Header */}
          <div>
            <span className="font-label-sm text-xs text-secondary uppercase tracking-widest block mb-1 font-semibold">
              System Diagnostics & Local Storage
            </span>
            <h1 className="font-headline-lg text-3xl sm:text-4xl font-serif text-primary font-medium tracking-tight">
              Settings & AI Telemetry
            </h1>
            <p className="font-body-md text-sm text-on-surface-variant mt-1">
              Transparent hardware metrics and local storage controls for WildLens AI.
            </p>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-semibold flex items-center gap-2 animate-fadeIn border border-secondary/30">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Model Status & Telemetry Card */}
          <section className="bg-surface-container-lowest rounded-xl p-6 plate-border shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e0d3] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[24px] text-primary">
                  memory
                </span>
                <span className="font-headline-sm text-lg font-serif text-primary font-semibold">
                  Open-Weight Foundation Model
                </span>
              </div>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${badge.color}`}>
                {badge.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-container-low border border-[#e5e0d3] flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase text-[10px]">
                  Vision Model (BioCLIP-2)
                </span>
                <span className="font-medium text-primary mt-0.5">
                  {telemetry?.vision_model_id || telemetry?.model_name || 'imageomics/bioclip-2'} (ViT-L/14)
                </span>
                <span className="text-[10px] text-secondary mt-0.5">
                  License: {telemetry?.vision_model_license || 'MIT'} · TreeOfLife-200M
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-[#e5e0d3] flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase text-[10px]">
                  Curated Knowledge Base
                </span>
                <span className="font-medium text-primary mt-0.5">
                  taxonomy_kb.py (Deterministic)
                </span>
                <span className="text-[10px] text-secondary mt-0.5">
                  Zero LLM · Mandatory Mushroom Guard
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-[#e5e0d3] flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase text-[10px]">
                  Vision Execution Device
                </span>
                <span className="font-medium text-primary mt-0.5 uppercase">
                  {telemetry?.vision_device || telemetry?.device || 'cpu'} (Multi-threaded)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-[#e5e0d3] flex flex-col">
                <span className="text-on-surface-variant font-semibold uppercase text-[10px]">
                  Taxa Grounding & Offline
                </span>
                <span className="font-medium text-primary mt-0.5">
                  {telemetry?.supported_taxa_count || 36} Reference Taxa · 100% Edge Verified
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#e5e0d3]">
              <div className="text-xs text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  verified
                </span>
                <span>Both Models 100% Open-Weight & MIT / Apache-2.0 Licensed</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTelemetryModal(true)}
                className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">developer_board</span>
                <span>Inspect AI Telemetry</span>
              </button>
            </div>
          </section>

          {/* FastAPI Backend Server & API Endpoint Configuration */}
          <section className="bg-surface-container-lowest rounded-xl p-6 plate-border shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e0d3] pb-4">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[24px] text-primary">
                  dns
                </span>
                <span className="font-headline-sm text-lg font-serif text-primary font-semibold">
                  FastAPI Backend Server & Cloud Host
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold ${
                telemetry?.status === 'ready'
                  ? 'bg-[#2e6b47] text-white'
                  : 'bg-zinc-200 text-zinc-700'
              }`}>
                {telemetry?.status === 'ready' ? 'API Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="text-xs text-on-surface-variant leading-relaxed">
              <p>
                <strong>Architecture Notice:</strong> WildLens AI is deployed as a static web app on GitHub Pages. Because GitHub Pages does not run Python or PyTorch, live BioCLIP-2 vision AI identification runs in an external FastAPI server.
              </p>
              <p className="mt-1">
                You can host the FastAPI server on <strong>Render</strong>, <strong>Railway</strong>, <strong>Hugging Face Spaces</strong>, or run it on your local network/machine.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container-low border border-[#e5e0d3] flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-primary flex items-center justify-between">
                  <span>FastAPI Service Base URL</span>
                  <span className="text-[10px] text-secondary font-mono">
                    {getStoredApiUrl()
                      ? 'Custom Override (Stored in Browser)'
                      : process.env.NEXT_PUBLIC_API_URL
                      ? 'Built from NEXT_PUBLIC_API_URL'
                      : 'Default Fallback'}
                  </span>
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://wildlens-ai-backend.onrender.com"
                    value={backendUrlInput}
                    onChange={(e) => setBackendUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-surface border border-[#e5e0d3] text-xs font-mono text-primary placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleTestBackend}
                    disabled={testingBackend}
                    className="px-3.5 py-2 rounded-lg bg-secondary text-on-secondary text-xs font-semibold hover:bg-secondary-container transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${testingBackend ? 'animate-spin' : ''}`}>
                      network_check
                    </span>
                    <span>{testingBackend ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-medium border flex items-start gap-2 ${
                    testResult.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5">
                    {testResult.ok ? 'check_circle' : 'error'}
                  </span>
                  <span className="leading-snug">{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e5e0d3]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetBackendUrl}
                    className="px-2.5 py-1 text-xs text-error hover:bg-red-50 rounded-md transition-colors font-medium"
                  >
                    Reset to Default
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBackendUrlInput('http://127.0.0.1:8000');
                    }}
                    className="px-2 py-1 text-[11px] text-secondary hover:bg-surface rounded-md transition-colors font-mono"
                  >
                    Set Localhost (127.0.0.1:8000)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveBackendUrl}
                  className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors shadow-sm"
                >
                  Save API Configuration
                </button>
              </div>
            </div>

            <div className="text-[11px] text-on-surface-variant/80 space-y-1 bg-surface-container-low/50 p-3 rounded-lg border border-[#e5e0d3]/60">
              <span className="font-semibold text-primary block">Deployment Quick Guide:</span>
              <p>• <strong>Render / Railway:</strong> Deploy <code>backend/Dockerfile</code> or <code>uvicorn app.main:app</code>.</p>
              <p>• <strong>CORS Setup:</strong> Set <code>CORS_ORIGINS=https://suguda-thakur-marndi.github.io</code> in backend environment variables.</p>
              <p>• <strong>GitHub Actions:</strong> In repo Settings &gt; Secrets and variables &gt; Actions &gt; Variables, set <code>NEXT_PUBLIC_API_URL</code> so every build automatically points to your production backend.</p>
            </div>
          </section>

          {/* Local Journal Storage Controls */}
          <section className="bg-surface-container-lowest rounded-xl p-6 plate-border shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b border-[#e5e0d3] pb-4">
              <span className="material-symbols-outlined text-[24px] text-primary">
                folder_shared
              </span>
              <span className="font-headline-sm text-lg font-serif text-primary font-semibold">
                Local Journal Data & Retention
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-surface-container-low border border-[#e5e0d3]">
              <div className="flex flex-col text-xs">
                <span className="font-semibold text-primary">IndexedDB Record Count</span>
                <span className="text-on-surface-variant">
                  {obsCount} observation dossiers saved in browser storage sandbox
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportJournal}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors shadow-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-xs text-on-surface-variant">
                Clear all observations from local storage
              </span>

              {showClearConfirm ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-error font-semibold">Are you sure?</span>
                  <button
                    onClick={handleClearJournal}
                    className="px-3 py-1.5 rounded-lg bg-error text-white text-xs font-bold min-h-[36px]"
                  >
                    Yes, Clear All
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container text-xs min-h-[36px]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-error hover:bg-red-50 text-xs font-semibold transition-colors min-h-[36px] w-full sm:w-auto"
                >
                  Clear Journal Records
                </button>
              )}
            </div>
          </section>

          {/* Camera Permission Guidance */}
          <section className="bg-surface-container-lowest rounded-xl p-6 plate-border shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[22px] text-primary">
                videocam
              </span>
              <span className="font-headline-sm text-base font-serif text-primary font-semibold">
                Camera Permission Guidance
              </span>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              When in the field, mobile browsers may request camera access to capture specimens. Your video stream is evaluated in temporary memory frame-by-frame and is never recorded or streamed to any remote server. If camera access is denied, you can always upload or select photos from your device gallery.
            </p>
          </section>

          {/* Application Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-on-surface-variant gap-2 pt-2 border-t border-[#e5e0d3]">
            <span>WildLens AI v1.4.0 · Hacktoberfest 2026 Edition</span>
            <span>MIT License · Pure Naturalist Instrument</span>
          </div>
        </div>
      </main>

      <BottomNav />

      {/* Real-time Hardware & AI Telemetry Modal */}
      <SystemStatusModal
        isOpen={showTelemetryModal}
        onClose={() => setShowTelemetryModal(false)}
        telemetry={telemetry}
        onRefresh={loadSettingsData}
      />
    </div>
  );
}
