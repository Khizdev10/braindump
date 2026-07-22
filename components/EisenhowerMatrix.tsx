'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { db, decryptNoteRecord, toggleArchiveNote, deleteNoteRecord, saveEncryptedNote, type DecryptedNote, type EncryptedNoteRecord } from '../lib/db';
import { AlertCircle, Calendar, Users, Trash2, Archive, Tag, AtSign, Edit2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EisenhowerMatrixProps {
  onEditNote: (note: DecryptedNote) => void;
}

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({ onEditNote }) => {
  const { masterKey } = useAuth();
  const [decryptedNotes, setDecryptedNotes] = useState<DecryptedNote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch and decrypt non-archived notes
  const loadNotes = async () => {
    if (!masterKey) return;
    setIsLoading(true);

    try {
      const records = await db.notes.where('isArchived').equals(0).toArray();
      const decrypted = await Promise.all(records.map((rec) => decryptNoteRecord(rec, masterKey)));
      setDecryptedNotes(decrypted);
    } catch (err) {
      console.error('Failed to load notes for matrix:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [masterKey]);

  // Move note to new quadrant
  const handleMoveQuadrant = async (note: DecryptedNote, newQuadrant: EncryptedNoteRecord['matrixQuadrant']) => {
    if (!masterKey) return;
    await saveEncryptedNote(note.title, note.content, masterKey, note.id, newQuadrant);
    await loadNotes();
  };

  const handleArchive = async (id: string) => {
    await toggleArchiveNote(id, true);
    await loadNotes();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Permanently delete this encrypted dump?')) {
      await deleteNoteRecord(id);
      await loadNotes();
    }
  };

  const quadrants: Array<{
    id: EncryptedNoteRecord['matrixQuadrant'];
    title: string;
    description: string;
    color: string;
    borderColor: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'do-first',
      title: 'Do First',
      description: 'Urgent & Critical Tasks',
      color: 'bg-red-950/20 text-red-400',
      borderColor: 'border-red-500/30',
      icon: <AlertCircle className="h-4 w-4 text-red-400" />,
    },
    {
      id: 'schedule',
      title: 'Schedule',
      description: 'Important & Strategic Ideas',
      color: 'bg-cyan-950/20 text-cyan-400',
      borderColor: 'border-cyan-500/30',
      icon: <Calendar className="h-4 w-4 text-cyan-400" />,
    },
    {
      id: 'delegate',
      title: 'Delegate',
      description: 'Urgent Entity & People Tasks',
      color: 'bg-amber-950/20 text-amber-400',
      borderColor: 'border-amber-500/30',
      icon: <Users className="h-4 w-4 text-amber-400" />,
    },
    {
      id: 'eliminate',
      title: 'Archive / Eliminate',
      description: 'Low-priority & Random Vents',
      color: 'bg-slate-900/60 text-slate-400',
      borderColor: 'border-slate-800',
      icon: <Trash2 className="h-4 w-4 text-slate-400" />,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Eisenhower Priority Matrix</h2>
          <p className="text-xs text-slate-400">Organize stream-of-consciousness thoughts by urgency & impact</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrants.map((quad) => {
          const quadNotes = decryptedNotes.filter((n) => n.matrixQuadrant === quad.id);

          return (
            <div
              key={quad.id}
              className={`rounded-2xl glass-panel p-4 border ${quad.borderColor} flex flex-col min-h-[300px]`}
            >
              {/* Quadrant Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${quad.color}`}>{quad.icon}</div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{quad.title}</h3>
                    <p className="text-[11px] text-slate-400">{quad.description}</p>
                  </div>
                </div>
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-slate-800">
                  {quadNotes.length}
                </span>
              </div>

              {/* Note Cards inside Quadrant */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
                {quadNotes.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No thoughts in this quadrant
                  </div>
                ) : (
                  quadNotes.map((note) => (
                    <motion.div
                      key={note.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="rounded-xl bg-slate-900/90 border border-slate-800 p-3.5 hover:border-cyan-500/40 transition group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h4 className="text-sm font-semibold text-slate-100 line-clamp-1">{note.title}</h4>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            onClick={() => onEditNote(note)}
                            className="p-1 text-slate-400 hover:text-cyan-400 rounded"
                            title="Edit Thought"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchive(note.id)}
                            className="p-1 text-slate-400 hover:text-amber-400 rounded"
                            title="Sweep to Archive"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded"
                            title="Delete Permanently"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-3 mb-3 whitespace-pre-wrap">{note.content}</p>

                      {/* Card Footer: Metadata & Quadrant Quick Switcher */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">{note.category}</span>
                          {note.tags.map((t) => (
                            <span key={t} className="text-cyan-400">
                              #{t}
                            </span>
                          ))}
                        </div>

                        {/* Move Quadrant Select */}
                        <select
                          value={note.matrixQuadrant}
                          onChange={(e) =>
                            handleMoveQuadrant(
                              note,
                              e.target.value as EncryptedNoteRecord['matrixQuadrant']
                            )
                          }
                          className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-slate-400 text-[10px] focus:outline-none"
                        >
                          <option value="do-first">Move: Do First</option>
                          <option value="schedule">Move: Schedule</option>
                          <option value="delegate">Move: Delegate</option>
                          <option value="eliminate">Move: Eliminate</option>
                        </select>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
