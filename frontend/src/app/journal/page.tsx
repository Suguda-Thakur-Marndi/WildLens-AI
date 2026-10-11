'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/src/components/Header';
import BottomNav from '@/src/components/BottomNav';
import { journalDb } from '@/src/lib/journalDb';
import { Observation } from '@/src/types';

import { useServiceConnectivity } from '@/src/lib/connectivity';

export default function JournalPage() {
  const connectivity = useServiceConnectivity();
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Plantae' | 'Animalia' | 'Fungi' | 'Verified'>('All');
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const pendingCount = typeof window !== 'undefined' ? journalDb.getPendingSyncIds().length : 0;

  const loadObservations = async () => {
    setLoading(true);
    try {
      const items = await journalDb.getAll();
      setObservations(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObservations();

    const handleSynced = () => {
      loadObservations();
    };

    window.addEventListener('wildlens:journal_synced', handleSynced);
    return () => window.removeEventListener('wildlens:journal_synced', handleSynced);
  }, []);

  const handleSyncWithServer = async () => {
    setIsSyncing(true);
    try {
      const res = await journalDb.syncWithServer();
      setSyncNotice(res.message);
      await loadObservations();
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err: any) {
      setSyncNotice(err.message || 'Synchronization failed.');
      setTimeout(() => setSyncNotice(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenDetail = (obs: Observation) => {
    setSelectedObs(obs);
    setEditNotes(obs.notes || '');
  };

  const handleSaveNotes = async () => {
    if (!selectedObs) return;
    const updated: Observation = { ...selectedObs, notes: editNotes };
    await journalDb.update(updated);
    setSelectedObs(updated);
    setObservations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const handleToggleVerified = async () => {
    if (!selectedObs) return;
    const nextStatus = selectedObs.status === 'User verified' ? 'Unverified' : 'User verified';
    const updated: Observation = { ...selectedObs, status: nextStatus };
    await journalDb.update(updated);
    setSelectedObs(updated);
    setObservations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const handleDelete = async (id: string) => {
    await journalDb.delete(id);
    setSelectedObs(null);
    setDeleteConfirmId(null);
    setObservations((prev) => prev.filter((o) => o.id !== id));
  };

  const handleExportAll = async () => {
    const jsonStr = await journalDb.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wildlens_field_journal_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Complete Field Journal JSON exported to local downloads.');
    setTimeout(() => setExportNotice(null), 4000);
  };

  const filteredObservations = observations.filter((obs) => {
    const matchesSearch =
      obs.common_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.scientific_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obs.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (obs.location && obs.location.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter === 'Verified') return obs.status === 'User verified';
    if (activeFilter === 'Plantae') return obs.kingdom === 'Plantae';
    if (activeFilter === 'Animalia') return obs.kingdom === 'Animalia';
    if (activeFilter === 'Fungi') return obs.kingdom === 'Fungi';
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col pb-20 lg:pb-0">
      <Header />

      <main className="w-full pt-20 flex-1">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-10 py-8 lg:py-12">
          {/* Section Header & Export Bar */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-label-sm text-xs text-secondary uppercase tracking-widest font-semibold">
                  Autonomous On-Device Storage
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    connectivity.backendConnected
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      connectivity.backendConnected ? 'bg-emerald-600' : 'bg-zinc-400'
                    }`}
                  />
                  <span>
                    {connectivity.backendConnected
                      ? 'Server Sync Ready'
                      : 'Offline IndexedDB'}
                  </span>
                </span>
                {pendingCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-300">
                    {pendingCount} unsynced
                  </span>
                )}
              </div>
              <h1 className="font-headline-lg text-3xl sm:text-4xl font-serif text-primary font-medium tracking-tight">
                My Field Journal
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant mt-1">
                IndexedDB botanical specimen logs stored persistently in your local browser sandbox.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={handleSyncWithServer}
                disabled={isSyncing}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-surface-container plate-border text-primary font-label-md text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[40px] disabled:opacity-50"
                title="Synchronize Field Journal with FastAPI server"
              >
                <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>{isSyncing ? 'Syncing...' : 'Sync Journal'}</span>
              </button>

              <button
                onClick={handleExportAll}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-surface-container plate-border text-primary font-label-md text-xs font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[40px]"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>Export Journal (JSON)</span>
              </button>

              <Link
                href="/identify"
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[40px]"
              >
                <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                <span>New Specimen</span>
              </Link>
            </div>
          </div>

          {/* Sync & Export Notification Notices */}
          {syncNotice && (
            <div className="mb-6 p-3 rounded-lg bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fadeIn border border-emerald-300">
              <span className="material-symbols-outlined text-[16px] text-emerald-700">sync</span>
              <span>{syncNotice}</span>
            </div>
          )}

          {exportNotice && (
            <div className="mb-6 p-3 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-semibold flex items-center gap-2 animate-fadeIn border border-secondary/30">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{exportNotice}</span>
            </div>
          )}

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 bg-surface-container-lowest p-3 rounded-xl plate-border shadow-sm">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-2.5 material-symbols-outlined text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search common name, genus, family, or trail location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low text-xs border border-transparent focus:border-primary outline-none transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', 'Plantae', 'Animalia', 'Fungi', 'Verified'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    activeFilter === filter
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Observation Gallery */}
          {loading ? (
            <div className="p-16 text-center text-on-surface-variant text-sm">
              Loading field journal from local IndexedDB...
            </div>
          ) : filteredObservations.length === 0 ? (
            /* Empty State */
            <div className="bg-surface-container-lowest rounded-xl p-12 plate-border shadow-sm text-center flex flex-col items-center gap-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[36px]">nature</span>
              </div>
              <h2 className="font-headline-md text-xl font-serif text-primary font-semibold">
                No Observations Recorded Yet
              </h2>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                Step outside into the living landscape. Photograph a wild flower, songbird, insect, or fungus using local BioCLIP AI.
              </p>
              <Link
                href="/identify"
                className="mt-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary-container transition-colors shadow-sm"
              >
                Identify First Organism
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredObservations.map((obs) => (
                <article
                  key={obs.id}
                  onClick={() => handleOpenDetail(obs)}
                  className="bg-surface-container-lowest rounded-xl overflow-hidden plate-border shadow-sm hover:shadow-md transition-shadow flex flex-col cursor-pointer group"
                >
                  <div className="relative aspect-[4/3] w-full bg-surface-dim overflow-hidden">
                    <img
                      src={obs.photo_url}
                      alt={obs.common_name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-[#f2fcf4]/90 text-primary font-label-sm text-[11px] font-semibold plate-border shadow-sm">
                        {obs.status === 'User verified'
                          ? 'User verified'
                          : `Likely (${Math.round(obs.certainty)}%)`}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <span className="font-label-sm text-[11px] text-secondary uppercase block font-semibold">
                        {obs.family}
                      </span>
                      <h3 className="font-headline-md text-lg font-serif text-primary leading-tight font-medium">
                        {obs.common_name}
                      </h3>
                      <p className="font-editorial-italic text-xs text-on-surface-variant italic font-serif">
                        {obs.scientific_name}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#e5e0d3] flex items-center justify-between text-on-surface-variant font-body-sm text-[11px]">
                      <span>{obs.date}</span>
                      <span className="font-medium text-primary truncate max-w-[120px]">
                        {obs.location.split('·')[0].trim()}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Observation Detail Modal */}
      {selectedObs && (
        <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-50 flex items-center justify-center p-2.5 sm:p-4 animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-xl max-w-xl w-full max-h-[92vh] overflow-y-auto plate-border shadow-2xl p-4 sm:p-6 flex flex-col gap-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e5e0d3] pb-3">
              <span className="font-label-sm text-xs uppercase text-secondary font-semibold">
                Specimen Record #{selectedObs.id}
              </span>
              <button
                onClick={() => setSelectedObs(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Specimen Photo Plate */}
            <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-surface-dim plate-border">
              <img
                src={selectedObs.photo_url}
                alt={selectedObs.common_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2.5 left-2.5 bg-[#f2fcf4]/95 px-2.5 py-1 rounded text-xs font-semibold text-primary plate-border">
                Certainty: {Math.round(selectedObs.certainty)}% via BioCLIP
              </div>
            </div>

            {/* Specimen Taxonomy & Date */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase text-secondary font-bold">
                  {selectedObs.family}
                </span>
                <span className="text-xs text-on-surface-variant">•</span>
                <span className="text-xs text-on-surface-variant">{selectedObs.date}</span>
              </div>
              <h2 className="font-headline-lg text-2xl font-serif text-primary font-medium mt-0.5">
                {selectedObs.common_name}
              </h2>
              <p className="font-editorial-italic text-sm text-on-surface-variant italic font-serif">
                {selectedObs.scientific_name}
              </p>
            </div>

            {/* Location & Habitat Specs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-surface-container-low border border-[#e5e0d3]">
                <span className="block text-on-surface-variant uppercase text-[10px] font-semibold">
                  Location
                </span>
                <span className="font-medium text-primary">{selectedObs.location}</span>
              </div>
              <div className="p-2 rounded bg-surface-container-low border border-[#e5e0d3]">
                <span className="block text-on-surface-variant uppercase text-[10px] font-semibold">
                  Verification Status
                </span>
                <span className="font-medium text-primary">{selectedObs.status}</span>
              </div>
            </div>

            {/* Editable Naturalist Notes */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-xs text-primary uppercase font-bold tracking-wider">
                  Field Notes & Diagnostic Observations
                </span>
                <button
                  onClick={handleSaveNotes}
                  className="text-xs text-secondary font-semibold hover:underline"
                >
                  Save Notes
                </button>
              </div>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs rounded-lg bg-surface-container-low border border-[#e5e0d3] focus:border-primary outline-none transition-colors"
                placeholder="Record lighting conditions, pollinator visits, or surrounding flora..."
              />
            </div>

            {/* Action Suite */}
            <div className="pt-3 border-t border-[#e5e0d3] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-2">
              <button
                onClick={handleToggleVerified}
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-secondary text-secondary hover:bg-secondary-container transition-colors flex items-center justify-center gap-1.5 min-h-[40px]"
              >
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>
                  {selectedObs.status === 'User verified'
                    ? 'Unverify'
                    : 'Mark Verified by Naturalist'}
                </span>
              </button>

              <div className="flex items-center justify-end gap-2">
                {deleteConfirmId === selectedObs.id ? (
                  <div className="flex flex-wrap items-center justify-end gap-1.5 w-full sm:w-auto">
                    <span className="text-xs text-error font-semibold">Delete?</span>
                    <button
                      onClick={() => handleDelete(selectedObs.id)}
                      className="px-2.5 py-1.5 rounded bg-error text-white text-xs font-bold min-h-[36px]"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-2.5 py-1.5 rounded bg-surface-container text-xs min-h-[36px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(selectedObs.id)}
                    className="w-10 h-10 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors flex items-center justify-center"
                    title="Delete observation"
                    aria-label="Delete observation"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
