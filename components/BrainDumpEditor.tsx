'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { saveEncryptedNote, analyzeBrainDump, type DecryptedNote } from '../lib/db';
import {
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Sparkles,
  Send,
  Eye,
  Edit3,
  Bold,
  Italic,
  List,
  Code,
  CheckSquare,
  Tag,
  AtSign,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BrainDumpEditorProps {
  onNoteCreated?: () => void;
  activeNoteForEdit?: DecryptedNote | null;
  onClearEditNote?: () => void;
}

export const BrainDumpEditor: React.FC<BrainDumpEditorProps> = ({
  onNoteCreated,
  activeNoteForEdit,
  onClearEditNote,
}) => {
  const { masterKey } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Populate editor if editing existing note
  useEffect(() => {
    if (activeNoteForEdit) {
      setTitle(activeNoteForEdit.title);
      setContent(activeNoteForEdit.content);
    }
  }, [activeNoteForEdit]);

  // Analyze smart metadata live
  const analysis = analyzeBrainDump(`${title} ${content}`);

  // Quick Save Handler
  const handleSave = useCallback(async () => {
    if (!masterKey || (!title.trim() && !content.trim())) return;

    setIsSaving(true);
    try {
      await saveEncryptedNote(
        title.trim() || 'Untitled Brain Dump',
        content,
        masterKey,
        activeNoteForEdit?.id
      );

      setTitle('');
      setContent('');
      if (onClearEditNote) onClearEditNote();
      if (onNoteCreated) onNoteCreated();
    } catch (err) {
      console.error('Failed to save brain dump:', err);
    } finally {
      setIsSaving(false);
    }
  }, [title, content, masterKey, activeNoteForEdit, onNoteCreated, onClearEditNote]);

  // Keybinding: Cmd/Ctrl + Enter for Quick-submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Web Speech API Integration
  const toggleVoiceRecording = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. Please try Chrome/Edge.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  };

  // Helper formatting injectors
  const insertFormatting = (prefix: string, suffix = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = content;
    const selected = text.substring(start, end);

    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 50);
  };

  return (
    <div
      className={`transition-all duration-300 ${
        isDistractionFree
          ? 'fixed inset-0 z-50 bg-slate-950 p-6 sm:p-12 overflow-y-auto flex flex-col'
          : 'relative w-full rounded-2xl glass-panel p-4 sm:p-6 border border-slate-800'
      }`}
    >
      {/* Editor Header / Controls */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-slate-200">
            {activeNoteForEdit ? 'Editing Thought' : 'Instant Brain Dump'}
          </span>
          <span className="hidden sm:inline-flex items-center text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
            Cmd+Enter to Save
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Voice Input Button */}
          <button
            onClick={toggleVoiceRecording}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition ${
              isRecording
                ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Voice-to-Text Braindump"
          >
            {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-cyan-400" />}
            <span className="hidden sm:inline">{isRecording ? 'Listening...' : 'Voice Dump'}</span>
          </button>

          {/* Toggle Preview Mode */}
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white transition"
            title="Toggle Markdown Preview"
          >
            {isPreviewMode ? <Edit3 className="h-4 w-4 text-cyan-400" /> : <Eye className="h-4 w-4" />}
          </button>

          {/* Toggle Distraction Free Mode */}
          <button
            onClick={() => setIsDistractionFree(!isDistractionFree)}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white transition"
            title="Toggle Fullscreen Focus View"
          >
            {isDistractionFree ? <Minimize2 className="h-4 w-4 text-amber-400" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || (!title.trim() && !content.trim())}
            className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Dump'}</span>
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {!isPreviewMode && (
        <div className="flex items-center gap-1 mb-3 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/60 overflow-x-auto">
          <button
            onClick={() => insertFormatting('**', '**')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs"
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('*', '*')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs"
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('- ')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs"
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('- [ ] ')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs"
            title="Checklist"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => insertFormatting('```\n', '\n```')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xs"
            title="Code Block"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Thought Title / Focus... (Optional)"
        className="w-full bg-transparent text-lg font-bold text-white placeholder-slate-500 focus:outline-none mb-3"
      />

      {/* Main Content Textarea or Preview */}
      {isPreviewMode ? (
        <div className="min-h-[220px] rounded-xl bg-slate-900/50 p-4 border border-slate-800 text-slate-200 prose prose-invert max-w-none whitespace-pre-wrap">
          {content || '*Nothing typed yet...*'}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Dump whatever is on your mind. Use #tags for topics, @entity for people/projects, or speak via Voice Dump..."
          rows={isDistractionFree ? 16 : 8}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-y"
        />
      )}

      {/* Smart Analysis Badge Strip */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-cyan-400" /> Smart Category:
        </span>
        <span className="rounded-full bg-cyan-950/80 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/30">
          {analysis.category}
        </span>

        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] text-slate-300 border border-slate-800">
          Sentiment: {analysis.sentiment}
        </span>

        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] text-slate-300 border border-slate-800">
          Matrix: {analysis.matrixQuadrant}
        </span>

        {analysis.tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-0.5 rounded-md bg-cyan-950/50 text-cyan-300 px-2 py-0.5 text-[10px]">
            <Tag className="h-2.5 w-2.5" />#{tag}
          </span>
        ))}

        {analysis.entities.map((ent) => (
          <span key={ent} className="inline-flex items-center gap-0.5 rounded-md bg-blue-950/50 text-blue-300 px-2 py-0.5 text-[10px]">
            <AtSign className="h-2.5 w-2.5" />@{ent}
          </span>
        ))}
      </div>
    </div>
  );
};
