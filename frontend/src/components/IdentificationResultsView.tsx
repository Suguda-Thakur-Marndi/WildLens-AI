'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { IdentificationResult, Observation } from '@/src/types';
import { journalDb } from '@/src/lib/journalDb';
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
