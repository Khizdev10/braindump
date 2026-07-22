'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { db, decryptNoteRecord, type DecryptedNote } from '../lib/db';
import { Search, Command, Tag, Plus, Download, Lock, X, Sparkles, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (note: DecryptedNote) => void;
  onNewDump: () => void;
  onOpenExport: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectNote,
  onNewDump,
  onOpenExport,
}) => {
  const { masterKey, lockVault } = useAuth();
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Keyboard Event Listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load and decrypt notes for instant search
  useEffect(() => {
    if (!isOpen || !masterKey) return;

    const loadData = async () => {
      try {
        const records = await db.notes.toArray();
        const decrypted = await Promise.all(records.map((r) => decryptNoteRecord(r, masterKey)));
        setNotes(decrypted);

        const allTags = await db.tags.toArray();
        setTags(allTags.map((t) => t.name));
      } catch (err) {
        console.error('Command palette search error:', err);
      }
    };
    loadData();
  }, [isOpen, masterKey]);

  if (!isOpen) return null;

  const filteredNotes = notes.filter((note) => {
    const matchTag = selectedTag ? note.tags.includes(selectedTag) : true;
    const matchQuery =
      query.trim() === '' ||
      note.title.toLowerCase().includes(query.toLowerCase()) ||
      note.content.toLowerCase().includes(query.toLowerCase()) ||
      note.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
    return matchTag && matchQuery;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="w-full max-w-2xl rounded-2xl glass-panel border border-slate-800 shadow-2xl overflow-hidden"
        >
          {/* Search Header Input */}
          <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3.5">
            <Search className="h-5 w-5 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search encrypted brain dumps, #tags, @entities, or type a command..."
              autoFocus
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Tag Pills */}
          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/50 border-b border-slate-800/60 overflow-x-auto">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Tag className="h-3 w-3 text-cyan-400" /> Filter:
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition ${
                  selectedTag === null ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                All
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition ${
                    selectedTag === tag ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Actions & Results Area */}
          <div className="max-h-[360px] overflow-y-auto p-2 divide-y divide-slate-800/60">
            {/* Quick Actions Header */}
            <div className="p-2 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-2">Quick Actions</p>

              <button
                onClick={() => {
                  onNewDump();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-400 transition"
              >
                <Plus className="h-4 w-4 text-cyan-400" />
                <span>Create New Brain Dump</span>
              </button>

              <button
                onClick={() => {
                  onOpenExport();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Export Notes (Markdown / JSON Backup)</span>
              </button>

              <button
                onClick={() => {
                  lockVault();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 hover:bg-red-950/40 hover:text-red-300 transition"
              >
                <Lock className="h-4 w-4 text-red-400" />
                <span>Lock Zero-Knowledge Vault</span>
              </button>
            </div>

            {/* Decrypted Notes Search Results */}
            <div className="p-2 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-2">
                Decrypted Thoughts ({filteredNotes.length})
              </p>

              {filteredNotes.length === 0 ? (
                <p className="text-xs text-slate-500 px-3 py-4 text-center">No matching encrypted dumps found</p>
              ) : (
                filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      onSelectNote(note);
                      onClose();
                    }}
                    className="w-full text-left rounded-xl p-3 hover:bg-slate-900/90 border border-transparent hover:border-slate-800 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-xs font-semibold text-white">{note.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{note.content}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
