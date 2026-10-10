'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PRESET_TEST_SPECIMENS } from '@/src/lib/sampleData';

export default function FieldModePage() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [timerRunning, setTimerRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const specimen = PRESET_TEST_SPECIMENS[0]; // Yellow Trout Lily specimen for sunlight field inspection

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          setFinished(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return (
    <div className="min-h-screen bg-[#0d170f] text-[#f4fff4] p-3 sm:p-6 md:p-8 flex flex-col justify-between select-none">
      {/* Top Sunlight Header */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between border-b border-[#2e5936] pb-3 sm:pb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8fc0a9] animate-pulse flex-shrink-0"></span>
          <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-[#8fc0a9] truncate">
            <span className="hidden xs:inline">Outdoor </span>Field Mode<span className="hidden sm:inline"> · High Contrast</span>
          </span>
        </div>
        <Link
          href="/"
          className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#1e3a24] text-[#f4fff4] text-[11px] sm:text-xs font-bold border border-[#4a7c59] hover:bg-[#2e5936] transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px] flex items-center"
        >
          Exit<span className="hidden sm:inline"> Sunlight Mode</span>
        </Link>
      </div>

      {/* Main Specimen & Observation Hub */}
      <div className="w-full max-w-xl mx-auto my-auto flex flex-col gap-4 sm:gap-6 py-4 sm:py-6">
        {/* Specimen Badge & Compact Plate */}
        <div className="flex items-center gap-3 sm:gap-4 bg-[#122316] p-3 sm:p-4 rounded-xl border border-[#2e5936]">
          <img
            src={specimen.image_url}
            alt={specimen.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border-2 border-[#8fc0a9] flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-[#8fc0a9] tracking-wider uppercase truncate">
              Field Specimen In Situ
            </span>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#f4fff4] leading-tight truncate">
              {specimen.name}
            </h1>
            <p className="text-xs sm:text-sm italic text-[#a3b899] font-serif truncate">
              {specimen.candidate.scientific_name}
            </p>
          </div>
        </div>

        {/* 3 Key High-Contrast Observable Diagnostic Features */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold text-[#8fc0a9] uppercase tracking-wider">
            Key Diagnostic Markers (Check With Your Eyes)
          </span>

          <div className="bg-[#182f1d] p-4 rounded-xl border-l-4 border-[#8fc0a9] flex flex-col">
            <span className="text-base font-bold text-[#f4fff4]">
              1. Mottled Trout-Skin Foliage
            </span>
            <span className="text-sm text-[#d0e0d4] mt-1">
              Look at the two basal leaves: are they speckled with dark purplish-brown blotches?
            </span>
          </div>

          <div className="bg-[#182f1d] p-4 rounded-xl border-l-4 border-[#8fc0a9] flex flex-col">
            <span className="text-base font-bold text-[#f4fff4]">
              2. Six Reflexed Yellow Petals
            </span>
            <span className="text-sm text-[#d0e0d4] mt-1">
              Do the yellow floral tepals curve backwards toward the stem under sunlight?
            </span>
          </div>

          <div className="bg-[#182f1d] p-4 rounded-xl border-l-4 border-[#8fc0a9] flex flex-col">
            <span className="text-base font-bold text-[#f4fff4]">
              3. Six Stamens in Nodding Cup
            </span>
            <span className="text-sm text-[#d0e0d4] mt-1">
              Check inside the downward blossom: are the prominent anthers yellow or chocolate brown?
            </span>
          </div>
        </div>

        {/* Mindful Screen-Break Timer Prompt */}
        <div className="bg-[#122316] p-5 rounded-xl border-2 border-[#4a7c59] flex flex-col items-center text-center gap-3">
          <p className="text-sm md:text-base font-medium text-[#f4fff4] leading-relaxed max-w-md">
            “Take two minutes. Notice its shape, movement, and surroundings. You don’t need to keep looking at your phone.”
          </p>

          <div className="flex items-center gap-4 my-1">
            <span className="text-3xl font-mono font-bold text-[#8fc0a9] tracking-widest">
              {timeFormatted}
            </span>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="px-4 py-2 rounded-lg bg-[#2e5936] text-[#f4fff4] font-bold text-sm border border-[#8fc0a9] hover:bg-[#4a7c59] transition-colors"
            >
              {timerRunning ? 'Pause Timer' : secondsLeft === 120 ? 'Start 2-Min Break' : 'Resume'}
            </button>
          </div>

          {finished && (
            <span className="text-xs text-[#8fc0a9] font-bold">
              ✓ 2 minutes elapsed. Great observation session!
            </span>
          )}
        </div>
      </div>

      {/* Big Thumb Finish Observation Control (Minimum 64px height) */}
      <div className="w-full max-w-xl mx-auto pt-4 border-t border-[#2e5936]">
        <button
          onClick={() => router.push('/journal')}
          className="w-full h-16 rounded-xl bg-[#8fc0a9] text-[#093421] font-bold text-lg hover:bg-[#a5d1b5] active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-lg"
        >
          <span className="material-symbols-outlined text-[26px]">check_circle</span>
          <span>I’ve Finished Observing</span>
        </button>
      </div>
    </div>
  );
}
