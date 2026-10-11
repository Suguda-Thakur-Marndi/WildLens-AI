'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchModelStatus } from '@/src/lib/api';
import { ModelTelemetry } from '@/src/types';
import SystemStatusModal from '@/src/components/system/SystemStatusModal';

export default function Header() {
  const pathname = usePathname();
  const [modelTelemetry, setModelTelemetry] = useState<ModelTelemetry | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  useEffect(() => {
    fetchModelStatus().then(setModelTelemetry).catch(() => {});
    const interval = setInterval(() => {
      fetchModelStatus().then(setModelTelemetry).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Explore', href: '/' },
    { label: 'Identify', href: '/identify' },
    { label: 'Field Missions', href: '/missions' },
    { label: 'My Journal', href: '/journal' },
    { label: 'About', href: '/about' },
  ];

  const statusShort =
    modelTelemetry?.status === 'ready'
      ? 'Ready'
      : modelTelemetry?.status === 'loading'
      ? 'Load'
      : 'Off';

  const statusLabel =
    modelTelemetry?.status === 'ready'
      ? 'Backend AI · Ready'
      : modelTelemetry?.status === 'loading'
      ? 'Backend AI · Loading'
      : 'Backend AI · Offline';

  const statusDotClass =
    modelTelemetry?.status === 'ready'
      ? 'bg-secondary'
      : modelTelemetry?.status === 'loading'
      ? 'bg-amber-500'
      : 'bg-red-500';

  return (
    <header className="fixed top-0 w-full z-50 bg-[#f2fcf4]/95 backdrop-blur-md border-b border-[#e5e0d3] shadow-[0_1px_8px_rgba(41,50,45,0.04)] overflow-x-clip">
      <div className="h-16 sm:h-20 max-w-[1280px] mx-auto px-2.5 sm:px-4 md:px-6 lg:px-10 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Brand Wordmark & Desktop Navigation */}
        <div className="flex items-center gap-3 sm:gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group flex-shrink-0" aria-label="WildLens AI Home">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">eco</span>
            </div>
            <span className="font-headline-sm text-[18px] sm:text-[22px] text-primary tracking-tight font-serif font-bold whitespace-nowrap">
              WildLens<span className="font-editorial-italic italic text-secondary ml-0.5 sm:ml-1 font-normal">AI</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6" aria-label="Primary navigation">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-label-md transition-colors ${
                    isActive
                      ? 'text-primary font-semibold border-b-2 border-primary pb-1 pt-1'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Operational Controls, Outdoor Mode, AI Status & Settings */}
        <div className="flex items-center gap-1 sm:gap-2.5 flex-shrink-0">
          {/* Outdoor Field Mode Action */}
          <Link
            href="/field-mode"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-sm text-[12px] font-semibold transition-colors border border-[#e5e0d3]"
            title="Switch to Outdoor Sunlight Field Mode"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">sunny</span>
            <span>Field Mode</span>
          </Link>

          {/* Persistent Local AI Status Indicator (opens detailed telemetry modal) */}
          <button
            type="button"
            onClick={() => setStatusModalOpen(true)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-surface-container-low border border-[#e5e0d3] text-primary hover:bg-surface-container transition-colors min-h-[36px] sm:min-h-[40px] cursor-pointer"
            title="BioCLIP-2 AI engine status, hardware metrics & telemetry"
            aria-label="View AI engine telemetry"
          >
            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${statusDotClass}`}></span>
            <span className="font-label-sm text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase whitespace-nowrap">
              <span className="hidden sm:inline">{statusLabel}</span>
              <span className="sm:hidden">{statusShort}</span>
            </span>
          </button>

          {/* Settings Control */}
          <Link
            href="/settings"
            aria-label="Settings and Storage"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center border border-transparent hover:border-[#e5e0d3] flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-primary hover:bg-surface-container-high transition-colors flex items-center justify-center flex-shrink-0"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="lg:hidden bg-[#f2fcf4] border-b border-[#e5e0d3] px-4 sm:px-6 py-4 shadow-lg animate-fadeIn max-h-[calc(100vh-4rem)] overflow-y-auto"
        >
          <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
            {navLinks.map((link) => {
              const isActive =
                link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2.5 px-3 rounded-lg font-label-md transition-colors min-h-[44px] flex items-center ${
                    isActive
                      ? 'bg-primary text-on-primary font-semibold'
                      : 'text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/field-mode"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2.5 px-3 rounded-lg font-label-md flex items-center gap-2 text-primary bg-secondary-container min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[18px]">sunny</span>
              <span>Outdoor Sunlight Field Mode</span>
            </Link>
          </nav>
        </div>
      )}

      {/* Real-time Hardware & AI Telemetry Modal */}
      <SystemStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        telemetry={modelTelemetry}
        onRefresh={() => fetchModelStatus().then(setModelTelemetry)}
      />
    </header>
  );
}
