'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/src/components/Header';
import BottomNav from '@/src/components/BottomNav';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col pb-20 lg:pb-0">
      <Header />

      <main className="w-full pt-20 flex-1">
        <div className="max-w-[900px] mx-auto px-4 md:px-6 lg:px-8 py-8 lg:py-14 flex flex-col gap-10">
          {/* Main Title & Vision Manifesto */}
          <div className="flex flex-col gap-3">
            <span className="font-label-sm text-xs text-secondary uppercase tracking-widest font-semibold">
              The WildLens AI Manifesto
            </span>
            <h1 className="font-headline-lg text-3xl sm:text-5xl font-serif text-primary font-medium tracking-tight leading-tight">
              A digital field guide for the real world.
            </h1>
            <p className="font-body-lg text-base sm:text-lg text-on-surface-variant leading-relaxed">
              Most modern mobile apps are engineered to maximize your screen time through continuous notifications, social feeds, and gamified streaks. WildLens AI is built on the opposite philosophy:
            </p>
            <div className="p-4 sm:p-6 bg-surface-container-low rounded-xl plate-border my-2 text-center">
              <span className="font-headline-md text-xl sm:text-2xl font-serif text-primary italic">
                “Identify it. Learn something. Look up. Go explore.”
              </span>
            </div>
          </div>

          {/* BioCLIP Foundation Model Deep Dive */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg text-2xl font-serif text-primary font-medium">
              Open-Weight AI: imageomics/bioclip-2
            </h2>
            <p className="font-body-md text-sm sm:text-base text-[#414943] leading-relaxed">
              Unlike generic cloud vision APIs that treat living organisms as commercial catalog objects, WildLens AI utilizes <strong>BioCLIP-2</strong> (Vision Transformer ViT-L/14), an open-weight foundation model developed by Imageomics and Ohio State University, trained on the massive <strong>TreeOfLife-200M</strong> dataset comprising over 200 million biological specimens across global taxa.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-4 bg-surface-container-lowest rounded-xl plate-border shadow-sm flex flex-col">
                <span className="font-label-sm text-[11px] text-secondary uppercase font-bold">
                  Architecture
                </span>
                <span className="font-headline-sm text-base text-primary font-semibold mt-1">
                  OpenCLIP ViT-L/14
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  768-dim Visual-Taxonomic Embeddings
                </span>
              </div>

              <div className="p-4 bg-surface-container-lowest rounded-xl plate-border shadow-sm flex flex-col">
                <span className="font-label-sm text-[11px] text-secondary uppercase font-bold">
                  Taxonomic Grounding
                </span>
                <span className="font-headline-sm text-base text-primary font-semibold mt-1">
                  TreeOfLife-10M
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  10,000,000 biological plates
                </span>
              </div>

              <div className="p-4 bg-surface-container-lowest rounded-xl plate-border shadow-sm flex flex-col">
                <span className="font-label-sm text-[11px] text-secondary uppercase font-bold">
                  License
                </span>
                <span className="font-headline-sm text-base text-primary font-semibold mt-1">
                  MIT License
                </span>
                <span className="text-xs text-on-surface-variant mt-0.5">
                  100% Permissive Open Source
                </span>
              </div>
            </div>
          </section>

          {/* Visual Architecture Diagram: 100% Local Image Processing */}
          <section className="flex flex-col gap-4">
            <h2 className="font-headline-lg text-2xl font-serif text-primary font-medium">
              100% Local Processing & Privacy Architecture
            </h2>
            <p className="font-body-md text-sm text-[#414943] leading-relaxed">
              Every photo you take and every note you record stays strictly on your device. Zero external cloud API calls, zero telemetry tracking, and zero advertising SDKs.
            </p>

            {/* Visual Process Flow */}
            <div className="bg-surface-container-lowest rounded-xl p-4 sm:p-6 plate-border shadow-sm flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-surface-container-low border border-[#e5e0d3]">
                  <span className="material-symbols-outlined text-[28px] text-primary mb-1">
                    photo_camera
                  </span>
                  <span className="font-label-md text-xs font-semibold text-primary">
                    1. Device Camera
                  </span>
                  <span className="text-[11px] text-on-surface-variant mt-0.5">
                    Local photo sensor
                  </span>
                </div>

                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-surface-container-low border border-[#e5e0d3]">
                  <span className="material-symbols-outlined text-[28px] text-primary mb-1">
                    memory
                  </span>
                  <span className="font-label-md text-xs font-semibold text-primary">
                    2. Local BioCLIP
                  </span>
                  <span className="text-[11px] text-on-surface-variant mt-0.5">
                    FastAPI / CPU inference
                  </span>
                </div>

                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-surface-container-low border border-[#e5e0d3]">
                  <span className="material-symbols-outlined text-[28px] text-primary mb-1">
                    database
                  </span>
                  <span className="font-label-md text-xs font-semibold text-primary">
                    3. IndexedDB
                  </span>
                  <span className="text-[11px] text-on-surface-variant mt-0.5">
                    Encrypted browser store
                  </span>
                </div>

                <div className="flex flex-col items-center text-center p-3 rounded-lg bg-secondary-container text-on-secondary-container border border-secondary/30">
                  <span className="material-symbols-outlined text-[28px] text-secondary mb-1">
                    cloud_off
                  </span>
                  <span className="font-label-md text-xs font-semibold">
                    4. Zero Cloud Uplink
                  </span>
                  <span className="text-[11px] mt-0.5">
                    Works offline on trail
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Model Limitations & Safety Disclosures */}
          <section className="flex flex-col gap-3 p-4 sm:p-5 rounded-xl bg-surface-container plate-border">
            <div className="flex items-center gap-2 text-primary font-serif font-bold text-base sm:text-lg">
              <span className="material-symbols-outlined text-[22px] text-secondary flex-shrink-0">
                shield
              </span>
              <span>Model Limitations & Safety Guidelines</span>
            </div>
            <ul className="list-disc list-inside text-xs sm:text-sm text-[#414943] space-y-2 leading-relaxed">
              <li>
                <strong>Not for Foraging or Edibility:</strong> Never consume wild plants or mushrooms based on AI predictions alone. Chemical toxicity and macroscopic spores require specialized laboratory mycological analysis.
              </li>
              <li>
                <strong>Anatomical Visual Correspondence:</strong> AI classification reflects visual morphological similarity in photographs, not genetic sequencing or guaranteed biological certainty.
              </li>
              <li>
                <strong>Respect Wildlife:</strong> Keep a respectful distance from all wild animals and nesting birds. Do not handle or disturb specimens for the sake of a photograph.
              </li>
            </ul>
          </section>

          {/* External Links & References */}
          <section className="flex flex-col sm:flex-row flex-wrap sm:items-center justify-between gap-3 sm:gap-4 pt-4 border-t border-[#e5e0d3] text-xs font-semibold">
            <a
              href="https://huggingface.co/imageomics/bioclip-2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:text-secondary transition-colors min-h-[36px]"
            >
              <span>Hugging Face: imageomics/bioclip-2</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <a
              href="https://github.com/Imageomics/bioclip"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:text-secondary transition-colors min-h-[36px]"
            >
              <span>GitHub: Imageomics/bioclip</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>

            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-secondary hover:text-primary transition-colors min-h-[36px]"
            >
              <span>View Hardware Telemetry & Diagnostics</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
