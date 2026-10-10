'use client';

import React, { useState, useEffect } from 'react';

interface MeditationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  specimenName?: string;
}

export default function MeditationOverlay({
  isOpen,
  onClose,
  specimenName = 'The organism',
}: MeditationOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(120);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(120);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const percentage = (secondsLeft / 120) * 100;

  return (
    <div className="fixed inset-0 bg-[#093421]/95 text-[#f2fcf4] z-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-fadeIn overflow-y-auto">
      <div className="max-w-md w-full flex flex-col items-center gap-4 sm:gap-6 my-auto py-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary flex-shrink-0">
          <span className="material-symbols-outlined text-[32px] sm:text-[40px]">eco</span>
        </div>

        <h2 className="font-headline-lg text-2xl sm:text-3xl font-serif text-[#f2fcf4] tracking-tight leading-tight">
          Now look up. Take two minutes.
        </h2>

        <p className="font-body-lg text-xs sm:text-sm md:text-base text-[#dbe5dd] leading-relaxed">
          {specimenName} is living in the physical world right in front of you. Notice how it interacts with the light, wind, and soil. You don’t need to keep looking at your screen.
        </p>

        {/* Circular Countdown Gauge */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center my-1 sm:my-2 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-[#234b36]"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            <path
              className="text-secondary transition-all duration-1000"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeDasharray={`${percentage}, 100`}
              strokeLinecap="round"
              strokeWidth="2.5"
            />
          </svg>
          <span className="absolute font-headline-sm text-xl sm:text-2xl font-semibold text-[#f2fcf4]">
            {timeFormatted}
          </span>
        </div>

        <button
          onClick={onClose}
          className="mt-2 sm:mt-4 px-6 py-2.5 rounded-lg bg-[#f2fcf4] text-primary font-label-md text-xs sm:text-sm hover:bg-[#e6f0e9] transition-colors shadow-sm font-semibold min-h-[44px] flex items-center justify-center"
        >
          Return to Field Specimen
        </button>
      </div>
    </div>
  );
}
