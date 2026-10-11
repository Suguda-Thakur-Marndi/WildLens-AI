'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  IdentificationResult,
  Observation,
  GeminiExplainResponse,
  GeminiAskResponse,
} from '@/src/types';
import { journalDb } from '@/src/lib/journalDb';
import { explainWithGemini, askGeminiNaturalist } from '@/src/lib/api';
import { useServiceConnectivity } from '@/src/lib/connectivity';
import MeditationOverlay from './MeditationOverlay';

interface IdentificationResultsViewProps {
  result: IdentificationResult;
  onRetake: () => void;
}

export default function IdentificationResultsView({
  result,
  onRetake,
}: IdentificationResultsViewProps) {
  const [gridOverlay, setGridOverlay] = useState(false);
  const [meditationOpen, setMeditationOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Gemini Naturalist State & Privacy Consent
  const connectivity = useServiceConnectivity();
  const [includeImageConsent, setIncludeImageConsent] = useState(false);
  const [geminiExplanation, setGeminiExplanation] = useState<GeminiExplainResponse | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Naturalist Interactive Q&A State
  const [userQuestion, setUserQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<GeminiAskResponse[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  const { top_candidate, alternatives, latency_ms } = result;

  const cosineScore = result.similarity_score !== undefined ? result.similarity_score : (top_candidate.similarity_score || 0.0);
  const softmaxDensity = result.softmax_density !== undefined ? result.softmax_density : top_candidate.confidence;
  const candidateCount = result.candidate_count || 36;

  const statusLower = (result.confidence_status || '').toLowerCase();
  const isInconclusive = statusLower.includes('not in my database') || statusLower.includes('not in') || statusLower.includes('inconclusive') || result.certainty_rating === 'inconclusive' || top_candidate.common_name === 'Not in my database';
  const isUncertain = !isInconclusive && (statusLower.includes('uncertain') || result.certainty_rating === 'uncertain' || top_candidate.common_name.toLowerCase().includes('uncertain'));
  const isAmbiguous = !isInconclusive && !isUncertain && (statusLower.includes('possible') || statusLower.includes('moderate') || result.certainty_rating === 'moderate');
  const isStrong = !isInconclusive && !isUncertain && !isAmbiguous;

  const handleSaveToJournal = async () => {
    try {
      const newObs: Observation = {
        id: `obs-${Date.now()}`,
        common_name: isInconclusive ? 'Not in my database' : isUncertain ? 'Uncertain: ' + top_candidate.common_name : top_candidate.common_name,
        scientific_name: isInconclusive ? 'Subject not recognized in catalog' : top_candidate.scientific_name,
        family: isInconclusive ? 'Indeterminate' : (top_candidate.family || 'Botanical / Wildlife Specimen'),
        kingdom: isInconclusive ? 'Indeterminate' : (top_candidate.kingdom || 'Plantae'),
        photo_url: result.image_url,
        date: 'Just now',
        timestamp: Date.now(),
        location: 'Field Trail Observation',
        certainty: Math.round(cosineScore * 100),
        status: isInconclusive ? 'Unverified' : isUncertain ? 'Unverified' : 'User verified',
        notes: isInconclusive
          ? `Inconclusive observation: highest BioCLIP-2 similarity score was (Cosine: ${cosineScore.toFixed(4)}). Organism is unrepresented in the ${candidateCount}-taxa candidate catalog.`
          : `BioCLIP-2 candidate match (Cosine: ${cosineScore.toFixed(4)}, closed-set softmax density: ${(softmaxDensity * 100).toFixed(1)}% across ${candidateCount} taxa). ${top_candidate.description || ''}`,
        diagnostic_traits: top_candidate.diagnostic_traits,
        elevation: '248 m',
        habitat: top_candidate.habitat || 'Local Natural Biome',
        exposure: '1/320s · f/4.0',
      };
      await journalDb.add(newObs);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      console.error('Failed to save to journal:', err);
    }
  };

  const toggleAudio = () => {
    setAudioPlaying(!audioPlaying);
    if (!audioPlaying) {
      if ('speechSynthesis' in window) {
        const text = isInconclusive
          ? `Specimen not in database. Cosine similarity of ${cosineScore.toFixed(4)} is below the threshold for candidate catalog inclusion. The organism is unrepresented in the ${candidateCount}-species candidate catalog.`
          : isUncertain
          ? `Identification uncertain. Highest candidate match is ${top_candidate.common_name} with visual similarity score of ${(cosineScore * 100).toFixed(1)} percent. Evidence is insufficient to rule out lookalikes in the field.`
          : `${top_candidate.common_name}. Scientific name: ${top_candidate.scientific_name}. Visual similarity score: ${(cosineScore * 100).toFixed(1)} percent against ${candidateCount} reference taxa. ${top_candidate.description || ''}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.onend = () => setAudioPlaying(false);
        window.speechSynthesis.speak(utterance);
      }
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const getBase64ImageIfConsented = async (): Promise<string | undefined> => {
    if (!includeImageConsent || !result.image_url) return undefined;
    try {
      const res = await fetch(result.image_url);
      const blob = await res.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resStr = reader.result as string;
          const commaIdx = resStr.indexOf(',');
          resolve(commaIdx !== -1 ? resStr.slice(commaIdx + 1) : resStr);
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  };

  const handleAskGeminiExplanation = async () => {
    setGeminiLoading(true);
    setGeminiError(null);
    try {
      const imgBase64 = await getBase64ImageIfConsented();
      const explanation = await explainWithGemini({
        specimen_name: top_candidate.common_name,
        scientific_name: top_candidate.scientific_name,
        family: top_candidate.family,
        kingdom: top_candidate.kingdom,
        diagnostic_traits: top_candidate.diagnostic_traits,
        confidence: top_candidate.confidence,
        image_base64: imgBase64,
      });
      setGeminiExplanation(explanation);
    } catch (err: any) {
      setGeminiError(
        err.userMessage || err.message || 'Gemini natural history explanation could not be retrieved.'
      );
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleAskNaturalistQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;
    setQaLoading(true);
    setQaError(null);
    const qText = userQuestion.trim();
    try {
      const imgBase64 = await getBase64ImageIfConsented();
      const answer = await askGeminiNaturalist({
        question: qText,
        specimen_name: top_candidate.common_name,
        scientific_name: top_candidate.scientific_name,
        family: top_candidate.family,
        context: top_candidate.diagnostic_traits?.join(', '),
        image_base64: imgBase64,
      });
      setQaHistory((prev) => [...prev, answer]);
      setUserQuestion('');
    } catch (err: any) {
      setQaError(
        err.userMessage || err.message || 'Naturalist Q&A failed to receive a response.'
      );
    } finally {
      setQaLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col animate-fadeIn">
      {/* Top Offline Status & Fast Action Bar */}
      <section className="w-full bg-surface-container-high border-b border-[#e5e0d3] py-2 px-3 sm:px-4 md:px-6 lg:px-10">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-primary text-[#f2fcf4] flex-shrink-0">
              <span className="material-symbols-outlined text-[14px]">offline_bolt</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <span className="font-label-md text-primary font-semibold">
                Identified in {latency_ms}ms
              </span>
              <span className="font-body-sm text-on-surface-variant">
                via on-device BioCLIP
              </span>
              <span className="text-[#c1c8c1] text-[11px] hidden xs:inline">•</span>
              <span className="font-label-sm text-[10px] sm:text-[11px] uppercase tracking-wider text-secondary font-semibold">
                Zero Cloud Upload
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleSaveToJournal}
              disabled={saved}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm min-h-[40px] ${
                saved
                  ? 'bg-secondary text-white'
                  : 'bg-primary text-on-primary hover:bg-primary-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {saved ? 'check_circle' : 'bookmark_add'}
              </span>
              <span>{saved ? 'Saved to Journal!' : 'Save to Field Journal'}</span>
            </button>

            <Link
              href="/journal"
              className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center flex-shrink-0"
              title="Open Field Journal"
            >
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Editorial Split Layout */}
      <div className="max-w-[1280px] mx-auto w-full px-4 md:px-6 lg:px-10 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Photographic Specimen Plate & Field Controls */}
          <div className="lg:col-span-5 flex flex-col gap-4 lg:sticky lg:top-24">
            {/* Botanical Plate Frame */}
            <div className="relative bg-surface-container-lowest rounded-xl overflow-hidden plate-border shadow-md flex flex-col">
              {/* Specimen Image Viewport */}
              <div className="relative aspect-[4/3] sm:aspect-square w-full bg-surface-container overflow-hidden group">
                <img
                  src={result.image_url}
                  alt={top_candidate.common_name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Botanical Loupe Grid Overlay */}
                {gridOverlay && (
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-secondary/40">
                    <div className="border border-secondary/20"></div>
                    <div className="border border-secondary/20"></div>
                    <div className="border border-secondary/20"></div>
                    <div className="border border-secondary/20"></div>
                    <div className="border border-secondary/20"></div>
                    <div className="border border-secondary/20"></div>
                    <div className="border border-secondary/20"></div>
                    <div className="border border-secondary/20"></div>
                    <div className="border border-secondary/20"></div>
                  </div>
                )}

                {/* Floating Optical Metadata Plate */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-2 rounded-lg bg-[#f2fcf4]/95 backdrop-blur text-primary shadow-sm border border-[#e5e0d3]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      photo_camera
                    </span>
                    <span className="font-label-sm text-[11px] font-semibold">
                      Local Specimen Viewfinder
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] uppercase text-on-surface-variant">
                    Plate #0429
                  </span>
                </div>

                {/* Optical Loupe Grid Overlay Toggle */}
                <button
                  onClick={() => setGridOverlay(!gridOverlay)}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-[#f2fcf4]/90 text-primary shadow-sm hover:bg-[#f2fcf4] transition-colors border border-[#e5e0d3]"
                  title="Toggle Botanical Alignment Grid"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {gridOverlay ? 'grid_off' : 'grid_goldenratio'}
                  </span>
                </button>
              </div>

              {/* Specimen Sub-Metadata */}
              <div className="p-3 sm:p-4 bg-surface-container-low flex flex-col gap-2.5 sm:gap-3 border-t border-[#e5e0d3]">
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-surface-container-lowest border border-[#e5e0d3] flex flex-col">
                    <span className="font-label-sm text-[10px] sm:text-[11px] text-on-surface-variant">
                      Exposure
                    </span>
                    <span className="font-label-md text-primary mt-0.5 font-semibold text-[11px] sm:text-xs truncate block">
                      1/320s · f/4.0
                    </span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-surface-container-lowest border border-[#e5e0d3] flex flex-col">
                    <span className="font-label-sm text-[10px] sm:text-[11px] text-on-surface-variant">
                      Elevation
                    </span>
                    <span className="font-label-md text-primary mt-0.5 font-semibold text-[11px] sm:text-xs truncate block">
                      248 m
                    </span>
                  </div>
                  <div className="p-1.5 sm:p-2 rounded-lg bg-surface-container-lowest border border-[#e5e0d3] flex flex-col">
                    <span className="font-label-sm text-[10px] sm:text-[11px] text-on-surface-variant">
                      Habitat
                    </span>
                    <span className="font-label-md text-primary mt-0.5 font-semibold text-[11px] sm:text-xs truncate block">
                      Temperate
                    </span>
                  </div>
                </div>

                {/* Field Operation Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={handleSaveToJournal}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary text-on-primary font-label-md flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-sm font-semibold min-h-[44px]"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>{saved ? 'Recorded in Journal' : 'Confirm & Record Entry'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onRetake}
                      className="py-2 px-2.5 sm:px-3 rounded-lg bg-surface-container-lowest border border-[#e5e0d3] text-primary font-label-md flex items-center justify-center gap-1.5 hover:bg-surface-container transition-colors text-[11px] sm:text-xs font-semibold min-h-[44px]"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                      <span className="truncate">Try Another Photo</span>
                    </button>

                    <Link
                      href="/field-mode"
                      className="py-2 px-2.5 sm:px-3 rounded-lg bg-surface-container border border-[#e5e0d3] text-primary font-label-md flex items-center justify-center gap-1.5 hover:bg-surface-container-highest transition-colors text-[11px] sm:text-xs font-semibold min-h-[44px]"
                    >
                      <span className="material-symbols-outlined text-[16px]">sunny</span>
                      <span className="truncate">Sunlight Glance</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Archival Geographic Pinning Micro-card */}
            <div className="p-4 bg-surface-container-lowest rounded-xl plate-border shadow-sm flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">
                explore
              </span>
              <div className="flex flex-col text-sm">
                <span className="font-label-md text-primary font-semibold">
                  Ephemeral Field Observation
                </span>
                <span className="font-body-sm text-on-surface-variant text-xs mt-0.5">
                  Natural colony recorded on local storage. No geographic data transmitted outside device.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Biological Dossier & Taxonomy */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Header Dossier */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {isInconclusive ? (
                  <>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-label-sm text-[11px] uppercase tracking-wider font-semibold border border-amber-300">
                      Not In Database
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] font-mono border border-[#e5e0d3]">
                      Cosine: {cosineScore.toFixed(4)} &lt; 0.60
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] border border-[#e5e0d3]">
                      Catalog Gap ({candidateCount} Taxa)
                    </span>
                  </>
                ) : isUncertain ? (
                  <>
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-950 font-label-sm text-[11px] uppercase tracking-wider font-semibold border border-amber-300">
                      Identification Uncertain
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] font-mono border border-[#e5e0d3]">
                      Cosine: {cosineScore.toFixed(4)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] border border-[#e5e0d3]">
                      Ambiguous Candidates
                    </span>
                  </>
                ) : (
                  <>
                    <span className="px-2.5 py-0.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-sm text-[11px] uppercase tracking-wider font-semibold border border-secondary/30">
                      {isStrong ? 'Top Catalog Candidate' : 'Tentative Match'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] border border-[#e5e0d3]">
                      Family {top_candidate.family || 'Wild Taxon'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] border border-[#e5e0d3]">
                      Kingdom {top_candidate.kingdom || 'Plantae'}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-1 flex flex-col">
                <h1 className="font-headline-lg text-3xl md:text-4xl font-serif text-primary tracking-tight font-medium">
                  {isInconclusive
                    ? 'Not in my database'
                    : isUncertain
                    ? 'Identification uncertain'
                    : top_candidate.common_name}
                </h1>
                <p className="font-editorial-italic text-lg text-on-surface-variant italic mt-0.5 font-serif">
                  {isInconclusive
                    ? 'Subject not recognized in candidate catalog'
                    : isUncertain
                    ? `Tentative: ${top_candidate.common_name} (${top_candidate.scientific_name})`
                    : top_candidate.scientific_name}
                </p>
              </div>
            </div>

            {/* Inconclusive / Catalog Gap Notice Box */}
            {isInconclusive && (
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-amber-900 text-sm">
                  <span className="material-symbols-outlined text-[20px] text-amber-700">warning_amber</span>
                  <span>Organism Unidentified — Not In Database</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  BioCLIP-2 evaluated this image against {candidateCount} reference taxa. 
                  The highest visual similarity score was only <strong className="font-mono">Cosine: {cosineScore.toFixed(4)}</strong>, 
                  which is below the threshold for catalog inclusion (0.60). 
                  The organism is unrepresented in the candidate catalog. 
                  The nearest mathematical matches below are references only and must not be treated as confirmed species.
                </p>
              </div>
            )}

            {/* BioCLIP-2 Model Transparency & Match Score Card */}
            <div className="p-4 bg-surface-container rounded-xl plate-border shadow-sm flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isStrong
                        ? 'bg-secondary'
                        : isAmbiguous
                        ? 'bg-amber-600'
                        : 'bg-red-600'
                    }`}
                  ></span>
                  <span className="font-label-md text-primary font-semibold text-sm">
                    {isInconclusive ? 'Similarity Score: Inconclusive' : `Similarity Score: ${(cosineScore * 100).toFixed(1)}%`}
                  </span>
                  <span className="font-body-sm text-xs text-on-surface-variant font-mono text-[11px]">
                    (Cosine: {cosineScore.toFixed(4)})
                  </span>
                  <span className="font-body-sm text-xs text-on-surface-variant/80 font-mono text-[11px] hidden md:inline">
                    · Softmax Mass ({candidateCount} taxa): {(softmaxDensity * 100).toFixed(1)}%
                  </span>
                </div>
                <span className="font-label-sm text-xs text-secondary bg-surface-container-lowest px-2 py-0.5 rounded border border-[#e5e0d3] font-semibold">
                  {isInconclusive
                    ? 'Not in Database'
                    : isUncertain
                    ? 'Identification Uncertain'
                    : isAmbiguous
                    ? 'Possible Match'
                    : 'Top Catalog Candidate'}
                </span>
              </div>

              {/* Match Distribution Gauge: Embedding Alignment (Cosine Similarity) */}
              <div className="flex flex-col gap-1.5">
                <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`${isInconclusive ? 'bg-amber-600' : 'bg-primary'} h-full transition-all duration-1000`}
                    style={{ width: `${Math.min(Math.max(isInconclusive ? 5 : Math.round(cosineScore * 100), 5), 100)}%` }}
                    title={`Top candidate cosine similarity: ${cosineScore.toFixed(4)}`}
                  ></div>
                  {alternatives[0] && (
                    <div
                      className="bg-secondary/70 h-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(Math.max(Math.round(((alternatives[0].similarity_score || 0) * 100)), 5), 100) * 0.5}%`,
                      }}
                      title={`Runner-up cosine similarity: ${(alternatives[0].similarity_score || 0).toFixed(4)}`}
                    ></div>
                  )}
                  <div className="bg-[#54402c]/20 h-full flex-1"></div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-label-sm text-on-surface-variant">
                  <span className="truncate max-w-[48%]">
                    {isInconclusive
                      ? 'Not in Database'
                      : `${top_candidate.scientific_name} (Sim: ${(cosineScore * 100).toFixed(1)}%)`}
                  </span>
                  {alternatives[0] && (
                    <span className="truncate max-w-[48%] text-right">
                      Runner-up: {alternatives[0].scientific_name} (Sim: {(((alternatives[0].similarity_score || 0)) * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Honest Scientific Metrics Explainer */}
              <div className="p-3 rounded-lg bg-surface-container-lowest border border-[#e5e0d3] flex flex-col gap-1.5 text-xs text-[#414943]">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <span className="material-symbols-outlined text-[16px] text-secondary">analytics</span>
                  <span>Scientific Scoring Transparency ({candidateCount} Reference Taxa)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                  <div>
                    <strong className="text-primary font-sans">Cosine Similarity:</strong> {cosineScore.toFixed(4)} ({((cosineScore * 100)).toFixed(1)}%)
                    <span className="block text-[10px] text-on-surface-variant font-sans">Raw embedding alignment in BioCLIP-2 768-D space</span>
                  </div>
                  <div>
                    <strong className="text-primary font-sans">Softmax Density:</strong> {(softmaxDensity * 100).toFixed(1)}%
                    <span className="block text-[10px] text-on-surface-variant font-sans">Relative mass strictly over {candidateCount} candidate species</span>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed pt-1 border-t border-[#e5e0d3]/60 font-sans">
                  <strong>Calibrated Probability:</strong> Uncalibrated. Softmax density is not an open-world probability of correctness. Open-world nature contains thousands of wild species not represented in this local {candidateCount}-species reference catalog. Always observe diagnostic traits outdoors before confirming species.
                </p>
              </div>
            </div>

            {/* Naturalist Overview - Only displayed when authentic data exists */}
            {(isInconclusive || top_candidate.description || top_candidate.habitat || top_candidate.field_verification_tip) && (
              <div className="p-4 bg-surface-container-lowest rounded-xl plate-border shadow-sm flex flex-col gap-1.5">
                <span className="font-label-sm text-[11px] uppercase tracking-wider text-secondary font-semibold">
                  Naturalist Overview
                </span>
                <p className="font-body-md text-sm text-[#151d19] leading-relaxed">
                  {isInconclusive
                    ? `Visual similarity across the local candidate database is below the reliable inclusion threshold (cosine < 0.60). The specimen is likely unrepresented in the local catalog. Compare tentative candidates below or capture a closer image in bright natural light.`
                    : top_candidate.description ||
                      `${top_candidate.common_name} (${top_candidate.scientific_name}) thrives in ${top_candidate.habitat ? top_candidate.habitat.toLowerCase() : 'natural ecosystems'}.${top_candidate.field_verification_tip ? ` Field verification tip: ${top_candidate.field_verification_tip}` : ''}`}
                </p>
              </div>
            )}

            {/* Observable Distinguishing Features (Diagnostic Checklist) - Hidden when no real traits are present */}
            {top_candidate.diagnostic_traits && top_candidate.diagnostic_traits.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-sm text-lg font-serif text-primary font-semibold">
                    {isInconclusive ? 'Outdoor Inspection Guidance' : 'Observable Diagnostic Traits'}
                  </h2>
                  <span className="font-label-sm text-xs text-on-surface-variant">
                    Examine in situ
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {top_candidate.diagnostic_traits.map((trait, index) => {
                    const [traitTitle, ...traitDesc] = trait.includes(':')
                      ? trait.split(':')
                      : [`Key Feature ${index + 1}`, trait];

                    return (
                      <div
                        key={index}
                        className="p-3.5 bg-surface-container-lowest rounded-xl plate-border shadow-sm flex items-start gap-3 hover:bg-surface-container-low transition-colors"
                      >
                        <div className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-primary font-headline-sm text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex flex-col text-sm">
                          <span className="font-headline-sm text-sm text-primary font-semibold">
                            {traitTitle}
                          </span>
                          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                            {traitDesc.join(':').trim() || traitTitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Candidate Alternatives / Tentative Nearest Neighbors */}
            {alternatives && alternatives.length > 0 && (
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h2 className="font-headline-sm text-lg font-serif text-primary font-semibold">
                      {isInconclusive
                        ? 'Tentative Model Matches in Local Catalog (Low Similarity)'
                        : isUncertain
                        ? 'Tentative Candidate Species to Compare Outdoors'
                        : 'Candidate Alternatives & Lookalikes'}
                    </h2>
                    <span className="text-xs text-on-surface-variant">
                      {isInconclusive
                        ? `Top nearest mathematical neighbors in ${candidateCount}-taxa database (none meet identification threshold)`
                        : isUncertain
                        ? `Multiple plausible candidate taxa detected with close visual similarity; compare field traits to disambiguate`
                        : `Top ranked alternative candidate taxa in ${candidateCount}-species reference catalog`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {alternatives.slice(0, 5).map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-surface-container-lowest rounded-xl plate-border shadow-sm flex flex-col justify-between gap-2"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-label-md text-primary font-semibold text-sm">
                            {alt.common_name}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] font-semibold">
                            {((alt.similarity_score ?? alt.confidence) * 100).toFixed(1)}% Sim
                          </span>
                        </div>
                        <span className="font-editorial-italic text-secondary text-xs italic font-serif">
                          {alt.scientific_name}
                        </span>
                        <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                          {isInconclusive
                            ? 'Incidental visual or background feature alignment in BioCLIP feature space. Not a confirmed identification.'
                            : alt.diagnostic_traits?.[0] || 'Inspect key physical characteristics and field marks to differentiate.'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#e5e0d3] flex items-center gap-1 font-label-sm text-[11px] text-secondary font-semibold">
                        <span className="material-symbols-outlined text-[14px]">
                          {isInconclusive ? 'help' : 'search'}
                        </span>
                        <span>
                          {isInconclusive
                            ? 'Tentative Nearest Neighbor (Unconfirmed)'
                            : 'Alternative candidate to rule out'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gemini Naturalist Exploration & Nature Q&A Card */}
            <div className="p-6 bg-surface-container-lowest rounded-xl plate-border shadow-sm flex flex-col gap-5 border border-[#e5e0d3]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#e5e0d3]">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                  </span>
                  <div>
                    <h2 className="font-headline-md text-lg sm:text-xl font-serif text-primary font-semibold">
                      Gemini Naturalist Exploration
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Cloud-assisted natural history synthesis & interactive ecological Q&A
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      !connectivity.isOnline
                        ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        : connectivity.geminiStatus === 'ready'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : connectivity.geminiStatus === 'unconfigured'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        !connectivity.isOnline
                          ? 'bg-zinc-400'
                          : connectivity.geminiStatus === 'ready'
                          ? 'bg-emerald-600'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span>
                      {!connectivity.isOnline
                        ? 'Offline · Disabled'
                        : connectivity.geminiStatus === 'ready'
                        ? 'Cloud AI Ready'
                        : connectivity.geminiStatus === 'unconfigured'
                        ? 'API Key Needed'
                        : 'Unavailable'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Privacy Notice & Conscious Consent Toggle */}
              <div className="p-3.5 rounded-lg bg-[#f6faf7] border border-[#d2e4d6] flex flex-col gap-2">
                <div className="flex items-start gap-2 text-xs text-[#2e593a]">
                  <span className="material-symbols-outlined text-[17px] text-secondary flex-shrink-0 mt-0.5">
                    lock
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-primary">Privacy & Data Boundary Guarantee</span>
                    <span className="text-[#526354] leading-relaxed">
                      All core BioCLIP-2 vision inferences execute locally. Gemini features contact Google via secure server proxy. Secrets remain exclusively on the backend.
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 mt-1 pt-2 border-t border-[#d2e4d6]/60 cursor-pointer text-xs font-semibold text-primary select-none">
                  <input
                    type="checkbox"
                    checked={includeImageConsent}
                    onChange={(e) => setIncludeImageConsent(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                  />
                  <span>Send specimen photograph to Gemini for multimodal visual inspection</span>
                </label>
                <span className="text-[11px] text-[#6c786e] pl-6">
                  {includeImageConsent
                    ? 'Opt-in active: Photograph will be transmitted via backend proxy to Gemini.'
                    : 'Opt-out default: Zero photo data will be sent. Gemini will synthesize natural history from taxonomy metadata only.'}
                </span>
              </div>

              {/* Offline or Service Unavailable Explanations */}
              {!connectivity.isOnline ? (
                <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-zinc-500 flex-shrink-0">
                    cloud_off
                  </span>
                  <div>
                    <strong className="block font-semibold text-zinc-800 mb-0.5">
                      Gemini Naturalist is currently unavailable offline
                    </strong>
                    <span>
                      An internet connection is required to contact Google Gemini. Your local BioCLIP-2 candidate matches, offline taxonomy traits, and Field Journal records remain 100% accessible above.
                    </span>
                  </div>
                </div>
              ) : connectivity.geminiStatus === 'unconfigured' ? (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-amber-600 flex-shrink-0">
                    key
                  </span>
                  <div>
                    <strong className="block font-semibold text-amber-900 mb-0.5">
                      GEMINI_API_KEY is not configured on backend
                    </strong>
                    <span>
                      To enable optional AI visual explanations and nature Q&A, set <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GEMINI_API_KEY</code> in your backend <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env</code> file. The key is kept strictly server-side.
                    </span>
                  </div>
                </div>
              ) : (
                /* Online and Configured Section */
                <div className="flex flex-col gap-4">
                  {/* Action Button: Explain Specimen */}
                  <div>
                    <button
                      onClick={handleAskGeminiExplanation}
                      disabled={geminiLoading}
                      className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-xs sm:text-sm font-semibold hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-sm min-h-[42px] disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${geminiLoading ? 'animate-spin' : ''}`}>
                        {geminiLoading ? 'hourglass_top' : 'auto_awesome'}
                      </span>
                      <span>
                        {geminiLoading
                          ? 'Consulting Gemini Naturalist...'
                          : geminiExplanation
                          ? 'Refresh Natural History Narrative'
                          : `Generate Ecological Narrative for ${top_candidate.common_name}`}
                      </span>
                    </button>
                  </div>

                  {geminiError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">error</span>
                      <span>{geminiError}</span>
                    </div>
                  )}

                  {/* Render Natural History Narrative if Generated */}
                  {geminiExplanation && (
                    <div className="p-4 sm:p-5 rounded-xl bg-white plate-border shadow-sm flex flex-col gap-3.5 animate-fadeIn">
                      <div className="flex items-center justify-between pb-2 border-b border-[#e5e0d3]">
                        <span className="font-serif font-bold text-primary text-base">
                          {geminiExplanation.specimen_name}
                        </span>
                        <span className="text-[11px] text-[#526354] bg-[#f4f2ea] px-2 py-0.5 rounded font-mono">
                          Provider: {geminiExplanation.provider}
                        </span>
                      </div>

                      {/* Mandatory Fungi Safety Guard Banner */}
                      {(geminiExplanation.is_fungi || geminiExplanation.safety_warnings.length > 0) && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2 font-medium">
                          <span className="material-symbols-outlined text-[18px] text-red-600 flex-shrink-0">
                            warning
                          </span>
                          <div className="space-y-1">
                            {geminiExplanation.safety_warnings.map((w, idx) => (
                              <p key={idx}>{w}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="font-body-md text-xs sm:text-sm text-on-surface leading-relaxed">
                        {geminiExplanation.summary}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div className="p-3 rounded-lg bg-[#f9faf8] border border-[#e5e0d3]">
                          <span className="font-bold text-primary block mb-1">Ecological Niche</span>
                          <p className="text-[#526354] leading-relaxed">{geminiExplanation.ecological_niche}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[#f9faf8] border border-[#e5e0d3]">
                          <span className="font-bold text-primary block mb-1">Seasonal Behavior</span>
                          <p className="text-[#526354] leading-relaxed">{geminiExplanation.seasonal_behavior}</p>
                        </div>
                      </div>

                      {geminiExplanation.lookalike_differentiators && geminiExplanation.lookalike_differentiators.length > 0 && (
                        <div className="p-3 rounded-lg bg-[#fbfdfa] border border-[#e5e0d3] text-xs">
                          <span className="font-bold text-primary block mb-1.5">Key Lookalike Distinctions</span>
                          <ul className="list-disc list-inside space-y-1 text-[#526354]">
                            {geminiExplanation.lookalike_differentiators.map((diff, i) => (
                              <li key={i}>{diff}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {geminiExplanation.indigenous_or_cultural_context && (
                        <div className="p-3 rounded-lg bg-[#fdfbf7] border border-[#ebdcc4] text-xs text-[#5c4930]">
                          <span className="font-bold text-[#44331b] block mb-1">Cultural & Indigenous History</span>
                          <p className="leading-relaxed">{geminiExplanation.indigenous_or_cultural_context}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Interactive Q&A Form */}
                  <div className="pt-2 border-t border-[#e5e0d3] flex flex-col gap-3">
                    <span className="font-label-md text-xs text-primary font-semibold">
                      Ask the Naturalist
                    </span>

                    <form onSubmit={handleAskNaturalistQuestion} className="flex gap-2">
                      <input
                        type="text"
                        value={userQuestion}
                        onChange={(e) => setUserQuestion(e.target.value)}
                        placeholder={`Ask anything about ${top_candidate.common_name} (habitat, pollinators, winter survival)...`}
                        className="flex-1 px-3 py-2 text-xs rounded-lg bg-surface-container-low border border-[#e5e0d3] focus:border-primary outline-none transition-colors"
                        disabled={qaLoading}
                      />
                      <button
                        type="submit"
                        disabled={qaLoading || !userQuestion.trim()}
                        className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors disabled:opacity-50 min-h-[38px] flex items-center gap-1.5"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${qaLoading ? 'animate-spin' : ''}`}>
                          {qaLoading ? 'progress_activity' : 'send'}
                        </span>
                        <span>Ask</span>
                      </button>
                    </form>

                    {qaError && (
                      <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                        {qaError}
                      </div>
                    )}

                    {/* Q&A Chat History */}
                    {qaHistory.length > 0 && (
                      <div className="space-y-2.5 mt-2 max-h-60 overflow-y-auto pr-1">
                        {qaHistory.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-[#f9faf8] border border-[#e5e0d3] text-xs space-y-1.5">
                            <div className="font-semibold text-primary flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-secondary">help</span>
                              <span>{item.question}</span>
                            </div>
                            <p className="text-[#526354] leading-relaxed pl-5">{item.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Prominent Naturalist "Now Look Up" Callout */}
            <div className="p-6 lg:p-8 bg-tertiary-fixed text-on-tertiary-fixed rounded-xl shadow-md relative overflow-hidden flex flex-col gap-4 border border-[#e5e0d3]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                </span>
                <span className="font-label-sm text-[11px] uppercase tracking-widest text-[#57432f] font-bold">
                  Field Directive
                </span>
              </div>

              <div className="flex flex-col gap-1.5 max-w-xl">
                <h3 className="font-headline-lg text-2xl font-serif text-on-tertiary-fixed leading-tight font-medium">
                  Now look up. Take two minutes.
                </h3>
                <p className="font-body-lg text-sm text-[#57432f] leading-relaxed">
                  Notice how the organism interacts with ambient wind and sunlight. Are there native solitary bees or foraging ants crawling along the base? You don’t need your screen for this part.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
                <button
                  onClick={() => setMeditationOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-tertiary text-on-tertiary font-label-md text-sm hover:bg-tertiary-container transition-all flex items-center justify-center gap-2 shadow-sm font-semibold min-h-[44px]"
                >
                  <span className="material-symbols-outlined text-[18px]">bedtime</span>
                  <span>Dim Screen for 2 Minutes</span>
                </button>

                <button
                  onClick={toggleAudio}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#f2fcf4]/80 text-primary font-label-md text-sm hover:bg-[#f2fcf4] transition-colors flex items-center justify-center gap-2 border border-[#e5e0d3] min-h-[44px]"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {audioPlaying ? 'stop' : 'volume_up'}
                  </span>
                  <span>{audioPlaying ? 'Stop Audio' : 'Naturalist Audio Note'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Break Meditation Overlay */}
      <MeditationOverlay
        isOpen={meditationOpen}
        onClose={() => setMeditationOpen(false)}
        specimenName={top_candidate.common_name}
      />
    </div>
  );
}
