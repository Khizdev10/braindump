'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { db, decryptNoteRecord, toggleArchiveNote, deleteNoteRecord, type DecryptedNote } from '../lib/db';
import { Archive, RotateCcw, Trash2, Calendar, Tag, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const TimeCapsuleArchive: React.FC = () => {
  const { masterKey } = useAuth();
  const [archivedNotes, setArchivedNotes] = useState<DecryptedNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadArchive = async () => {
    if (!masterKey) return;
    setIsLoading(true);

    try {
      const records = await db.notes.where('isArchived').equals(1).toArray();
      const decrypted = await Promise.all(records.map((r) => decryptNoteRecord(r, masterKey)));
      setArchivedNotes(decrypted);
    } catch (err) {
      console.error('Failed to load archive:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadArchive();
  }, [masterKey]);

  const handleRestore = async (id: string) => {
    await toggleArchiveNote(id, false);
    await loadArchive();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this archived brain dump?')) {
      await deleteNoteRecord(id);
      await loadArchive();
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Archive className="h-5 w-5 text-cyan-400" /> Time Capsule Timeline
          </h2>
          <p className="text-xs text-slate-400">Swept thoughts preserved in encrypted local history</p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-cyan-300 border border-slate-800">
          {archivedNotes.length} Archived Dumps
        </span>
      </div>

      {archivedNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-800 rounded-2xl glass-panel">
          <Archive className="h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-300">Archive is Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            When you sweep thoughts away from your main canvas or matrix, they safely land here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {archivedNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl glass-panel p-4 border border-slate-800 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h3 className="text-base font-bold text-white">{note.title}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <Calendar className="h-3 w-3 text-slate-500" />
                    <span>{new Date(note.createdAt).toLocaleString()}</span>
                    <span>•</span>
                    <span className="capitalize text-cyan-400">{note.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(note.id)}
                    className="flex items-center gap-1 rounded-xl bg-cyan-950/60 border border-cyan-800/60 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/60 transition"
                    title="Restore to Active Canvas"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-900 transition"
                    title="Delete Permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>

              {note.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-800/60 text-[10px]">
                  {note.tags.map((t) => (
                    <span key={t} className="text-cyan-400">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
