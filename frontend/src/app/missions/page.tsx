'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/src/components/Header';
import BottomNav from '@/src/components/BottomNav';
import { FIELD_MISSIONS } from '@/src/lib/sampleData';
import { FieldMission } from '@/src/types';

export default function MissionsPage() {
  const [missions] = useState<FieldMission[]>(FIELD_MISSIONS);
  const [selectedMission, setSelectedMission] = useState<FieldMission | null>(null);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('wildlens_completed_missions');
        if (saved) {
          setCompletedMap(JSON.parse(saved));
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const handleToggleComplete = (id: string) => {
    const updated = { ...completedMap, [id]: !completedMap[id] };
    setCompletedMap(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('wildlens_completed_missions', JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col pb-20 lg:pb-0">
      <Header />

      <main className="w-full pt-20 flex-1">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-10 py-8 lg:py-12">
          {/* Section Header */}
          <div className="max-w-2xl mb-8">
            <span className="font-label-sm text-xs text-secondary uppercase tracking-widest block mb-1 font-semibold">
              Mindful Outdoor Exploration
            </span>
            <h1 className="font-headline-lg text-3xl sm:text-4xl font-serif text-primary font-medium tracking-tight">
              Touch Grass Missions
            </h1>
            <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-2 leading-relaxed">
              Designed to engage your hearing, sight, and tactile senses in the living world. Zero cloud trackers, zero addictive streak gamification.
            </p>
          </div>

          {/* Missions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {missions.map((mission) => {
              const isCompleted = completedMap[mission.id];

              return (
                <article
                  key={mission.id}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden plate-border shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="relative aspect-[16/9] w-full bg-surface-dim overflow-hidden">
                    <img
                      src={mission.image_url}
                      alt={mission.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-[#f2fcf4]/90 text-primary font-label-sm text-[11px] font-semibold plate-border shadow-sm">
                        {mission.duration}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                        {mission.difficulty}
                      </span>
                    </div>

                    {isCompleted && (
                      <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-lg bg-secondary text-white font-label-sm text-[11px] font-semibold shadow-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        <span>Completed</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="font-label-sm text-[11px] text-secondary uppercase tracking-wider block mb-1 font-semibold">
                        {mission.subtitle || mission.category}
                      </span>
                      <h2 className="font-headline-md text-xl font-serif text-primary font-medium leading-tight">
                        {mission.title}
                      </h2>
                      <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-2 leading-relaxed">
                        {mission.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#e5e0d3] flex items-center justify-between">
                      <button
                        onClick={() => setSelectedMission(mission)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary-container transition-all shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_circle</span>
                        <span>Start Mission</span>
                      </button>

                      <button
                        onClick={() => handleToggleComplete(mission.id)}
                        className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          isCompleted
                            ? 'text-secondary hover:text-primary'
                            : 'text-on-surface-variant hover:text-primary'
                        }`}
                        title="Mark as completed"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isCompleted ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>

      {/* Mission Detail Modal */}
      {selectedMission && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto plate-border shadow-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">
            <div className="flex items-center justify-between border-b border-[#e5e0d3] pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-semibold">
                  {selectedMission.duration} · {selectedMission.difficulty}
                </span>
              </div>
              <button
                onClick={() => setSelectedMission(null)}
                className="w-9 h-9 rounded-lg text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                aria-label="Close mission details"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div>
              <h2 className="font-headline-lg text-xl sm:text-2xl font-serif text-primary font-medium leading-tight">
                {selectedMission.title}
              </h2>
              {selectedMission.quote && (
                <p className="font-editorial-italic text-xs sm:text-sm text-secondary italic font-serif mt-1">
                  {selectedMission.quote}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 sm:gap-3">
              <span className="font-label-sm text-xs text-primary uppercase font-bold tracking-wider">
                Naturalist Field Instructions
              </span>
              <div className="flex flex-col gap-2">
                {selectedMission.instructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#414943]">
                    <span className="w-5 h-5 rounded-full bg-surface-container text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-lg bg-surface-container-low border border-[#e5e0d3] flex flex-col gap-1.5">
              <span className="font-label-sm text-[11px] text-secondary uppercase font-bold tracking-wider">
                Observation Prompts
              </span>
              <ul className="list-disc list-inside text-xs text-on-surface-variant space-y-1">
                {selectedMission.prompts.map((prompt, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-[#e5e0d3]">
              <button
                onClick={() => setSelectedMission(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors min-h-[44px] flex items-center justify-center"
              >
                Close
              </button>

              <button
                onClick={() => {
                  handleToggleComplete(selectedMission.id);
                  setSelectedMission(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>
                  {completedMap[selectedMission.id]
                    ? 'Completed (Click to Reset)'
                    : 'Mark Mission Complete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
