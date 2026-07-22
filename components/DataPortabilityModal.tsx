'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { exportNotesAsMarkdown, exportEncryptedJSONBackup, importJSONBackup } from '../lib/utils/exportImport';
import { Download, Upload, FileText, ShieldCheck, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataPortabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataPortabilityModal: React.FC<DataPortabilityModalProps> = ({ isOpen, onClose }) => {
  const { masterKey } = useAuth();
  const [importStatus, setImportStatus] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen || !masterKey) return null;

  const handleExportMarkdown = async () => {
    try {
      await exportNotesAsMarkdown(masterKey);
    } catch (err) {
      console.error('Markdown export failed:', err);
    }
  };

  const handleExportJSON = async () => {
    try {
      await exportEncryptedJSONBackup();
    } catch (err) {
      console.error('JSON export failed:', err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Reading backup payload...');

    try {
      const text = await file.text();
      const result = await importJSONBackup(text, masterKey);
      setImportStatus(`Success! Imported ${result.importedCount} brain dumps.`);
    } catch (err) {
      console.error('Import failed:', err);
      setImportStatus('Failed to import backup file. Ensure it is a valid MindSpill backup.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg rounded-2xl glass-panel border border-slate-800 p-6 shadow-2xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">Data Portability & Backup</h2>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Export Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Export Options</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleExportMarkdown}
                  className="flex flex-col items-start gap-2 rounded-xl bg-slate-900/90 border border-slate-800 p-4 text-left hover:border-cyan-500/40 transition group"
                >
                  <FileText className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Decrypted Markdown</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Export all thoughts as a formatted .md bundle</p>
                  </div>
                </button>

                <button
                  onClick={handleExportJSON}
                  className="flex flex-col items-start gap-2 rounded-xl bg-slate-900/90 border border-slate-800 p-4 text-left hover:border-emerald-500/40 transition group"
                >
                  <ShieldCheck className="h-6 w-6 text-emerald-400 group-hover:scale-110 transition" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Encrypted JSON Backup</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Full zero-knowledge database backup</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Restore Backup</h3>

              <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/50 p-6 text-center hover:border-cyan-500/50 cursor-pointer transition">
                <Upload className="h-8 w-8 text-cyan-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">Click or drag JSON backup to import</span>
                <span className="text-[10px] text-slate-500 mt-1">Supports MindSpill backup JSON files</span>
                <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
              </label>

              {importStatus && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-3 text-xs text-slate-300 border border-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{importStatus}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
