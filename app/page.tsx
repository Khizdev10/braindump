'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '../lib/context/AuthContext';
import { SyncProvider } from '../lib/context/SyncContext';
import { Header } from '../components/Header';
import { VaultUnlock } from '../components/VaultUnlock';
import { BrainDumpEditor } from '../components/BrainDumpEditor';
import { EisenhowerMatrix } from '../components/EisenhowerMatrix';
import { TimeCapsuleArchive } from '../components/TimeCapsuleArchive';
import { CommandPalette } from '../components/CommandPalette';
import { DataPortabilityModal } from '../components/DataPortabilityModal';
import { db, decryptNoteRecord, toggleArchiveNote, deleteNoteRecord, type DecryptedNote } from '../lib/db';
import { FileText, Archive, Trash2, Edit3, Plus, Sparkles, Lock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function MainApp() {
  const { isUnlocked, masterKey } = useAuth();

  const [currentView, setCurrentView] = useState<'editor' | 'matrix' | 'archive'>('editor');
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const [recentDumps, setRecentDumps] = useState<DecryptedNote[]>([]);
  const [activeEditNote, setActiveEditNote] = useState<DecryptedNote | null>(null);

  // Register PWA Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('MindSpill PWA ServiceWorker registered:', reg.scope))
        .catch((err) => console.warn('ServiceWorker registration failed:', err));
    }
  }, []);

  // Fetch recent active dumps for the canvas list
  const loadRecentDumps = async () => {
    if (!masterKey) return;
    try {
      const records = await db.notes.where('isArchived').equals(0).toArray();
      const decrypted = await Promise.all(records.map((r) => decryptNoteRecord(r, masterKey)));
      // Sort newest first
      decrypted.sort((a, b) => b.createdAt - a.createdAt);
      setRecentDumps(decrypted);
    } catch (err) {
      console.error('Error loading recent dumps:', err);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadRecentDumps();
    }
  }, [isUnlocked, masterKey]);

  const handleArchive = async (id: string) => {
    await toggleArchiveNote(id, true);
    await loadRecentDumps();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this encrypted brain dump?')) {
      await deleteNoteRecord(id);
      await loadRecentDumps();
    }
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isLightMode ? 'light-mode bg-slate-50 text-slate-900' : 'bg-[#090d16] text-slate-100 bg-grid-pattern'}`}>
      <Header
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        currentView={currentView}
        setCurrentView={setCurrentView}
        isLightMode={isLightMode}
        setIsLightMode={setIsLightMode}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {!isUnlocked ? (
          <VaultUnlock />
        ) : (
          <div className="space-y-6">
            {/* View Switching Navigation for Mobile */}
            <div className="flex md:hidden items-center justify-between rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              <button
                onClick={() => setCurrentView('editor')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                  currentView === 'editor' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400'
                }`}
              >
                Canvas
              </button>
              <button
                onClick={() => setCurrentView('matrix')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                  currentView === 'matrix' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400'
                }`}
              >
                Matrix
              </button>
              <button
                onClick={() => setCurrentView('archive')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                  currentView === 'archive' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400'
                }`}
              >
                Archive
              </button>
            </div>

            {/* Canvas Dump View */}
            {currentView === 'editor' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Primary Brain Dump Canvas (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <BrainDumpEditor
                    onNoteCreated={loadRecentDumps}
                    activeNoteForEdit={activeEditNote}
                    onClearEditNote={() => setActiveEditNote(null)}
                  />
                </div>

                {/* Stream of Conscious Dumps List (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-cyan-400" /> Recent Brain Dumps ({recentDumps.length})
                    </h3>
                    {activeEditNote && (
                      <button
                        onClick={() => setActiveEditNote(null)}
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> New Dump
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {recentDumps.length === 0 ? (
                      <div className="rounded-2xl glass-panel p-8 text-center border border-dashed border-slate-800">
                        <FileText className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No brain dumps captured yet.</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Start typing above or use Voice Dump to capture your first thought.
                        </p>
                      </div>
                    ) : (
                      recentDumps.map((note) => (
                        <motion.div
                          key={note.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-2xl glass-panel p-4 border transition ${
                            activeEditNote?.id === note.id
                              ? 'border-cyan-500/80 bg-cyan-950/20'
                              : 'border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="text-sm font-bold text-white line-clamp-1">{note.title}</h4>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setActiveEditNote(note)}
                                className="p-1 text-slate-400 hover:text-cyan-400 rounded"
                                title="Edit"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleArchive(note.id)}
                                className="p-1 text-slate-400 hover:text-amber-400 rounded"
                                title="Archive"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(note.id)}
                                className="p-1 text-slate-400 hover:text-red-400 rounded"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 line-clamp-3 mb-3 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-cyan-300">
                                {note.category}
                              </span>
                              {note.tags.map((t) => (
                                <span key={t} className="text-cyan-400 font-medium">
                                  #{t}
                                </span>
                              ))}
                            </div>
                            <span className="text-slate-500">{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Eisenhower Matrix View */}
            {currentView === 'matrix' && (
              <EisenhowerMatrix
                onEditNote={(note) => {
                  setActiveEditNote(note);
                  setCurrentView('editor');
                }}
              />
            )}

            {/* Time Capsule Archive View */}
            {currentView === 'archive' && <TimeCapsuleArchive />}
          </div>
        )}
      </main>

      {/* Modals & Overlays */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectNote={(note) => {
          setActiveEditNote(note);
          setCurrentView('editor');
        }}
        onNewDump={() => {
          setActiveEditNote(null);
          setCurrentView('editor');
        }}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      <DataPortabilityModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthProvider>
      <SyncProvider>
        <MainApp />
      </SyncProvider>
    </AuthProvider>
  );
}
