'use client';

import React, { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/src/components/Header';
import BottomNav from '@/src/components/BottomNav';
import { identifyImageFile } from '@/src/lib/api';
import { IdentificationResult } from '@/src/types';
import { PRESET_TEST_SPECIMENS } from '@/src/lib/sampleData';

const IdentificationResultsView = dynamic(
  () => import('@/src/components/IdentificationResultsView'),
  {
    loading: () => (
      <div className="w-full max-w-[1000px] mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-secondary animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
          <span>Rendering specimen telemetry...</span>
        </div>
      </div>
    ),
  }
);

const CameraModal = dynamic(() => import('@/src/components/CameraModal'), {
  ssr: false,
});

export default function IdentifyPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 15MB limit. Please select a smaller photo.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Unsupported format. Please upload a JPG, PNG, WebP, or AVIF image.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handlePresetSelect = async (specimen: typeof PRESET_TEST_SPECIMENS[0]) => {
    setErrorMsg(null);
    try {
      const response = await fetch(specimen.image_url);
      const blob = await response.blob();
      const file = new File([blob], specimen.file, { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreviewUrl(specimen.image_url);
    } catch {
      // Fallback
      setPreviewUrl(specimen.image_url);
      setSelectedFile(new File([], specimen.file, { type: 'image/jpeg' }));
    }
  };

  const handleIdentify = async () => {
    if (!selectedFile && !previewUrl) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const fileToProcess = selectedFile || new File([], 'specimen.jpg', { type: 'image/jpeg' });
      const identificationResult = await identifyImageFile(fileToProcess);
      if (previewUrl && (!identificationResult.image_url || identificationResult.image_url.startsWith('blob:'))) {
        identificationResult.image_url = previewUrl;
      }
      setResult(identificationResult);
    } catch (err: any) {
      setErrorMsg(err.userMessage || err.message || 'Identification failed. Please try another angle or photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col pb-20 lg:pb-0">
      <Header />

      <main className="w-full pt-20 flex-1 flex flex-col">
        {result ? (
          <IdentificationResultsView result={result} onRetake={handleRetake} />
        ) : (
          <div className="max-w-[1000px] mx-auto w-full px-4 md:px-6 lg:px-8 py-8 flex flex-col items-center">
            {/* Page Header */}
            <div className="text-center max-w-xl mb-6">
              <span className="font-label-sm text-xs text-secondary uppercase tracking-widest block mb-1 font-semibold">
                Autonomous Optical Loupe
              </span>
              <h1 className="font-headline-lg text-3xl sm:text-4xl font-serif text-primary font-medium tracking-tight">
                Identify Wild Specimen
              </h1>
              <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-2 leading-relaxed">
                Photograph any flower, leaf, fungus, or creature. Evaluated on-device via BioCLIP with 100% privacy and zero cell service required.
              </p>
            </div>

            {/* Error Banner State */}
            {errorMsg && (
              <div className="w-full max-w-xl mb-6 p-4 rounded-xl bg-error-container text-on-error-container flex flex-col gap-2 border border-red-200 shadow-sm animate-fadeIn">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] text-error flex-shrink-0 mt-0.5">
                    warning
                  </span>
                  <div className="flex flex-col text-sm flex-1">
                    <span className="font-semibold text-error">Notice</span>
                    <span className="text-xs text-[#93000a] mt-0.5 leading-relaxed">{errorMsg}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-red-200/50 justify-end">
                  <a
                    href="./../settings"
                    className="text-xs font-semibold text-primary underline hover:text-primary-container"
                  >
                    Configure Backend in Settings →
                  </a>
                </div>
              </div>
            )}

            {/* Main Specimen Viewport / Upload Zone */}
            <div className="w-full max-w-xl bg-surface-container-lowest rounded-xl plate-border shadow-md overflow-hidden flex flex-col">
              {previewUrl ? (
                /* Image Preview State */
                <div className="relative aspect-[4/3] w-full bg-surface-dim overflow-hidden flex flex-col">
                  <img
                    src={previewUrl}
                    alt="Selected Specimen Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-wrap sm:flex-nowrap justify-end items-center gap-1.5 max-w-[calc(100%-1rem)]">
                    <button
                      type="button"
                      onClick={() => setCameraModalOpen(true)}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#f2fcf4]/95 backdrop-blur text-primary text-[11px] sm:text-xs font-semibold plate-border shadow-sm hover:bg-[#f2fcf4] transition-colors flex items-center gap-1 min-h-[36px]"
                    >
                      <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                      <span><span className="hidden xs:inline">Retake with </span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#f2fcf4]/95 backdrop-blur text-primary text-[11px] sm:text-xs font-semibold plate-border shadow-sm hover:bg-[#f2fcf4] transition-colors flex items-center gap-1 min-h-[36px]"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      <span>Replace</span>
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-[#f2fcf4]/95 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-primary plate-border shadow-sm flex items-center gap-1.5 sm:gap-2 max-w-[calc(100%-1rem)]">
                    <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0"></span>
                    <span className="truncate">Specimen Ready for Classification</span>
                  </div>
                </div>
              ) : (
                /* No Image Selected / Drop Zone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 sm:p-12 border-2 border-dashed border-[#e5e0d3] hover:border-secondary transition-colors cursor-pointer flex flex-col items-center justify-center text-center gap-4 group bg-surface-container-low/30"
                >
                  <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined text-[36px]">
                      center_focus_strong
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-headline-sm text-lg font-serif text-primary font-semibold">
                      Drag and drop image here
                    </span>
                    <span className="font-body-sm text-xs text-on-surface-variant">
                      or click to browse local files (JPG, PNG, WebP, AVIF up to 15MB)
                    </span>
                  </div>
                </div>
              )}

              {/* Control Action Buttons */}
              <div className="p-4 sm:p-6 bg-surface-container-low border-t border-[#e5e0d3] flex flex-col gap-3">
                {previewUrl ? (
                  <button
                    onClick={handleIdentify}
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-lg bg-primary text-on-primary font-label-md text-base hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-sm font-semibold disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Evaluating BioCLIP Taxonomy...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">
                          psychology
                        </span>
                        <span>Identify Specimen with Local AI</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Live Camera Viewfinder Access */}
                    <button
                      type="button"
                      onClick={() => setCameraModalOpen(true)}
                      className="py-3 px-4 rounded-lg bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-sm font-semibold"
                    >
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      <span>Take a Photo</span>
                    </button>

                    {/* File Upload Access */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-3 px-4 rounded-lg bg-surface-container-lowest plate-border text-primary font-label-md text-sm hover:bg-surface-container transition-colors flex items-center justify-center gap-2 font-semibold shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      <span>Upload Image</span>
                    </button>
                  </div>
                )}

                {/* Naturalist Field Guidance */}
                <div className="pt-2 flex items-start gap-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">
                    nature_people
                  </span>
                  <p className="leading-relaxed">
                    <strong>Naturalist Guidance:</strong> Photograph the specimen clearly without disturbing it. Capture distinct flower heads, bark patterns, or wing markings under diffuse daylight.
                  </p>
                </div>
              </div>
            </div>

            {/* Hidden File Input for Image Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Quick Test Specimens Section */}
            <div className="w-full max-w-xl mt-8 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-xs text-secondary uppercase font-semibold tracking-wider">
                  Test Offline Specimen Library
                </span>
                <span className="text-xs text-on-surface-variant font-medium">
                  Instant One-Click Samples
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_TEST_SPECIMENS.map((specimen) => (
                  <button
                    key={specimen.name}
                    onClick={() => handlePresetSelect(specimen)}
                    className="p-2 bg-surface-container-lowest plate-border rounded-lg text-left hover:bg-surface-container transition-all flex flex-col gap-1.5 shadow-sm group"
                  >
                    <div className="aspect-[4/3] w-full rounded overflow-hidden bg-surface-dim">
                      <img
                        src={specimen.image_url}
                        alt={specimen.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <span className="text-xs font-semibold text-primary truncate block">
                      {specimen.name}
                    </span>
                    <span className="text-[10px] text-on-surface-variant italic font-serif truncate block">
                      {specimen.candidate.scientific_name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live In-App Camera Viewfinder Modal */}
        <CameraModal
          isOpen={cameraModalOpen}
          onClose={() => setCameraModalOpen(false)}
          onCapture={(file, preview) => {
            setSelectedFile(file);
            setPreviewUrl(preview);
            setErrorMsg(null);
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
}
