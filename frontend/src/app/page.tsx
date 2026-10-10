'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/src/components/Header';
import BottomNav from '@/src/components/BottomNav';
import { SAMPLE_OBSERVATIONS } from '@/src/lib/sampleData';

export default function ExplorePage() {
  const recentObservations = SAMPLE_OBSERVATIONS.slice(1, 5);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col pb-20 lg:pb-0">
      <Header />

      <main className="w-full pt-20 flex-1">
        {/* Top Subtle Utility Bar / Status Strip */}
        <section className="w-full bg-surface-container-low/70 border-b border-[#e5e0d3]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-10 py-2 flex flex-wrap items-center justify-between gap-2 text-on-surface-variant font-body-sm text-xs">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-surface-container text-primary font-label-sm font-semibold border border-[#e5e0d3]">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                BioCLIP v1.4 Engine Active
              </span>
              <span className="text-on-surface-variant/40">·</span>
              <span className="flex items-center gap-1 text-on-surface-variant font-label-sm">
                <span className="material-symbols-outlined text-[15px] text-secondary">
                  signal_cellular_off
                </span>
                Offline Cache Armed
              </span>
            </div>

            <div className="flex items-center gap-3 text-on-surface-variant font-label-sm">
              <span className="hidden sm:inline">Local Storage: 5 Specimen Dossiers</span>
              <span className="text-on-surface-variant/40 hidden sm:inline">·</span>
              <span className="text-secondary font-editorial-italic italic font-serif">
                Field Log No. 04
              </span>
            </div>
          </div>
        </section>

        {/* Editorial Hero Section */}
        <section className="w-full relative overflow-hidden bg-background">
          <div className="max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-10 py-8 sm:py-10 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Column: Typography & Intent */}
              <div className="lg:col-span-7 flex flex-col items-start space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary-container text-on-secondary-container border border-secondary/30">
                  <span className="material-symbols-outlined text-[15px]">eco</span>
                  <span className="font-label-sm text-[11px] uppercase tracking-widest font-semibold">
                    Autonomous Naturalist Instrument
                  </span>
                </div>

                <h1 className="font-display-lg text-3xl xs:text-4xl sm:text-5xl lg:text-[54px] font-serif text-primary tracking-tight max-w-xl leading-[1.15] break-words">
                  A little more curious.<br />
                  <span className="font-editorial-italic text-secondary italic font-normal">
                    A little less scrolling.
                  </span>
                </h1>

                <p className="font-body-lg text-base sm:text-lg text-on-surface-variant max-w-xl leading-relaxed">
                  Identify plants, fungi, birds, and insects in seconds using an open-weight BioCLIP model running entirely on your device. Zero cloud sync required. Built for the remote trail, not the endless feed.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <Link
                    href="/identify"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all shadow-sm font-semibold min-h-[44px]"
                  >
                    <span className="material-symbols-outlined text-[20px]">center_focus_strong</span>
                    <span>Identify Something</span>
                  </Link>

                  <Link
                    href="/missions"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-surface-container-lowest text-primary font-label-md text-sm hover:bg-surface-container transition-colors shadow-sm plate-border font-semibold min-h-[44px]"
                  >
                    <span className="material-symbols-outlined text-[20px] text-secondary">explore</span>
                    <span>Explore Field Missions</span>
                  </Link>
                </div>

                <div className="flex items-center gap-2 pt-2 text-on-surface-variant font-label-sm text-xs">
                  <span className="inline-flex p-1 rounded-full bg-surface-container text-secondary flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                  </span>
                  <span>100% On-device inference · Works with zero cell service</span>
                </div>
              </div>

              {/* Right Column: Naturalist Composition / Visual Plate */}
              <div className="lg:col-span-5 relative w-full">
                <div className="relative bg-surface-container-lowest rounded-xl p-3.5 sm:p-4 plate-border shadow-md w-full">
                  {/* Archival Header Label */}
                  <div className="flex items-center justify-between pb-3 text-on-surface-variant font-label-sm text-xs">
                    <span className="uppercase tracking-wider font-semibold">Specimen Plate: #082-TR</span>
                    <span className="font-editorial-italic text-secondary italic font-serif">
                      Temperate Old Growth
                    </span>
                  </div>

                  {/* Primary Specimen Image with Aspect Ratio */}
                  <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-surface-dim">
                    <img
                      className="w-full h-full object-cover"
                      alt="Close up photograph of lush green moss and wild fern in ancient Pacific rainforest"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjT3TGfSdp5sHWY7UHHD6rBzip6dhTM7D9BjIlAkgd1tCZRYc5_xnFAoTBu1PRCsyVDQ3xjuEJ3uQTX2ULA63mw_MDnvJGyA_inoZWJgsx2pxPq2KJ0fzgwlCKuGtFj3ysLmWcK4tCyRDCCcYK2epP_a5a0_-tTUpIbEWEaB5Q2VEG9OIv7ReMnLGtX7aIa8SMo4EQkEizdOpJzkSRClofO_Q3ed_ACb1OWyCFYWxHKnjlKvoCioVu"
                    />
                    <div className="absolute bottom-3 left-3 bg-[#f2fcf4]/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 border border-[#e5e0d3] max-w-[calc(100%-1.5rem)]">
                      <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0"></span>
                      <span className="font-label-sm text-xs text-primary font-semibold truncate">
                        WebGPU Match: 97.4%
                      </span>
                    </div>
                  </div>

                  {/* Marginalia Notes */}
                  <div className="pt-4 grid grid-cols-2 gap-2 text-left">
                    <div className="p-2.5 rounded-lg bg-surface-container-low border border-[#e5e0d3]">
                      <span className="block font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold">
                        Ecosystem
                      </span>
                      <span className="font-body-md text-xs sm:text-sm text-primary font-medium truncate block">
                        Olympic Lowland Rain
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-container-low border border-[#e5e0d3]">
                      <span className="block font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold">
                        Classification Latency
                      </span>
                      <span className="font-body-md text-xs sm:text-sm text-primary font-medium truncate block">
                        18ms Neural Engine
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secondary Overlapping Field Card (shown on md+ to avoid mobile/tablet overflow) */}
                <div className="hidden md:flex absolute -bottom-5 -left-4 lg:-left-6 bg-surface-container-high rounded-xl p-3 shadow-md items-center gap-3 max-w-xs plate-border">
                  <span className="material-symbols-outlined text-primary text-[28px] flex-shrink-0">nature</span>
                  <div className="text-left">
                    <p className="font-label-sm text-xs text-secondary uppercase font-semibold">
                      Local Herbarium
                    </p>
                    <p className="font-body-sm text-xs text-primary font-medium">
                      Encrypted on hardware storage
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission of the Day: Highlight Section */}
        <section className="w-full py-4 bg-background">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-10">
            <div className="bg-surface-container-low rounded-xl p-6 md:p-8 plate-border shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-secondary-fixed text-on-secondary-fixed font-label-sm text-xs font-semibold tracking-wide uppercase border border-secondary/30">
                      Field Mission of the Day
                    </span>
                    <span className="flex items-center gap-1 font-label-sm text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[15px]">timer</span>
                      10 min · Easy outdoor observation
                    </span>
                  </div>

                  <h2 className="font-headline-lg text-2xl md:text-3xl font-serif text-primary pt-1 font-medium">
                    The Lichen Micro-Safari
                  </h2>

                  <p className="font-body-md text-sm md:text-base text-on-surface-variant max-w-2xl leading-relaxed">
                    Find three distinct species of lichen on tree bark, stone, or old timber. Learn to distinguish between crustose (crust-like), foliose (leafy), and fruticose (shrubby hair-like) morphologies.
                  </p>
                </div>

                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-center gap-3">
                  <Link
                    href="/missions"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-colors shadow-sm font-semibold"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_circle</span>
                    <span>Start Mission</span>
                  </Link>

                  <span className="font-editorial-italic text-sm text-secondary italic font-serif text-left lg:text-right">
                    “Look closer; a single boulder holds an entire archipelago.”
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recently Observed in Your Field Journal */}
        <section className="w-full py-10 bg-background">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-10">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
              <div>
                <span className="font-label-sm text-xs text-secondary uppercase tracking-widest block mb-1 font-semibold">
                  Local Specimen Registry
                </span>
                <h2 className="font-headline-lg text-2xl md:text-3xl font-serif text-primary font-medium">
                  Recently Observed in Your Field Journal
                </h2>
              </div>

              <Link
                href="/journal"
                className="inline-flex items-center gap-1 font-label-md text-sm text-primary hover:text-secondary transition-colors group font-semibold"
              >
                <span>View all observations in Journal</span>
                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </Link>
            </div>

            {/* 4-Card Specimen Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentObservations.map((obs) => (
                <article
                  key={obs.id}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden plate-border shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="relative aspect-[4/3] w-full bg-surface-dim overflow-hidden">
                    <img
                      src={obs.photo_url}
                      alt={obs.common_name}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-[#f2fcf4]/90 text-primary font-label-sm text-[11px] font-semibold border border-[#e5e0d3]">
                      {obs.status === 'User verified'
                        ? 'User verified'
                        : `Likely (${Math.round(obs.certainty)}%)`}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <span className="font-label-sm text-[11px] text-secondary uppercase block mb-1 font-semibold">
                        {obs.family}
                      </span>
                      <h3 className="font-headline-md text-xl font-serif text-primary leading-tight font-medium">
                        {obs.common_name}
                      </h3>
                      <p className="font-editorial-italic text-sm text-on-surface-variant italic font-serif">
                        {obs.scientific_name}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#e5e0d3] flex items-center justify-between text-on-surface-variant font-body-sm text-xs">
                      <span>{obs.date}</span>
                      <span className="font-medium text-primary">{obs.location.split('·')[0].trim()}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How WildLens Works (Without the Cloud) */}
        <section className="w-full py-12 bg-surface-container-low/50 border-t border-[#e5e0d3]">
          <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-10">
            <div className="max-w-2xl mx-auto text-center mb-10">
              <span className="font-label-sm text-xs text-secondary uppercase tracking-widest block mb-1 font-semibold">
                Ethical Optics
              </span>
              <h2 className="font-headline-lg text-2xl md:text-3xl font-serif text-primary font-medium">
                How WildLens Works (Without the Cloud)
              </h2>
              <p className="font-body-md text-sm md:text-base text-on-surface-variant mt-2">
                A purpose-built digital instrument designed to respect both your privacy and the natural environment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="bg-surface-container-lowest rounded-xl p-6 plate-border shadow-sm flex flex-col items-start text-left">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary font-serif font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="font-headline-sm text-xl font-serif text-primary font-semibold">
                  Optical Specimen Capture
                </h3>
                <p className="font-body-sm text-sm text-on-surface-variant mt-2 leading-relaxed">
                  Snap or upload a specimen image. Your camera frame is evaluated immediately in temporary browser memory with zero network uplink.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-surface-container-lowest rounded-xl p-6 plate-border shadow-sm flex flex-col items-start text-left">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary font-serif font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="font-headline-sm text-xl font-serif text-primary font-semibold">
                  On-Device BioCLIP AI
                </h3>
                <p className="font-body-sm text-sm text-on-surface-variant mt-2 leading-relaxed">
                  Our open-weight Vision Transformer compares morphological features against 10,240 biological taxa grounded in the Tree of Life.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-surface-container-lowest rounded-xl p-6 plate-border shadow-sm flex flex-col items-start text-left">
                <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary font-serif font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="font-headline-sm text-xl font-serif text-primary font-semibold">
                  Look Up & Explore
                </h3>
                <p className="font-body-sm text-sm text-on-surface-variant mt-2 leading-relaxed">
                  Review observable traits, dim your screen for two minutes, and return to observing the organism with your own eyes outdoors.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-[#e5e0d3] py-8 text-on-surface-variant text-sm">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-primary">WildLens AI</span>
            <span>·</span>
            <span className="text-xs">Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass</span>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold">
            <Link href="/about" className="hover:text-primary transition-colors">
              BioCLIP Architecture
            </Link>
            <Link href="/journal" className="hover:text-primary transition-colors">
              IndexedDB Journal
            </Link>
            <Link href="/settings" className="hover:text-primary transition-colors">
              Engine Telemetry
            </Link>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}
