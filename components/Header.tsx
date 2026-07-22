'use client';

import React from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { useSync } from '../lib/context/SyncContext';
import { Lock, Unlock, Wifi, WifiOff, Command, Download, ShieldCheck, Moon, Sun, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onOpenExportModal: () => void;
  currentView: 'editor' | 'matrix' | 'archive';
  setCurrentView: (view: 'editor' | 'matrix' | 'archive') => void;
  isLightMode: boolean;
  setIsLightMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  onOpenExportModal,
  currentView,
  setCurrentView,
  isLightMode,
  setIsLightMode,
}) => {
  const { isUnlocked, lockVault } = useAuth();
  const { isOnline, syncStatus, pendingQueueCount } = useSync();

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-800/80 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                Mind<span className="text-cyan-400">Spill</span>
              </h1>
              <span className="inline-flex items-center rounded-full bg-cyan-950/80 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30">
                Zero-Knowledge
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Offline-First Brain Dump</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        {isUnlocked && (
          <nav className="hidden md:flex items-center gap-1 rounded-xl bg-slate-900/80 p-1 border border-slate-800">
            <button
              onClick={() => setCurrentView('editor')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                currentView === 'editor'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Canvas Dump
            </button>
            <button
              onClick={() => setCurrentView('matrix')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                currentView === 'matrix'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Eisenhower Matrix
            </button>
            <button
              onClick={() => setCurrentView('archive')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                currentView === 'archive'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Time Capsule Archive
            </button>
          </nav>
        )}

        {/* Status Indicators & Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Network Status Pill */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
              !isOnline
                ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                : syncStatus === 'syncing'
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40 animate-pulse'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {!isOnline ? (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Offline Mode - Saved Locally</span>
                <span className="sm:hidden">Offline</span>
              </>
            ) : (
              <>
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">
                  {syncStatus === 'syncing'
                    ? 'Syncing local queue...'
                    : pendingQueueCount > 0
                    ? `Pending (${pendingQueueCount})`
                    : 'Online - Synced'}
                </span>
                <span className="sm:hidden">Online</span>
              </>
            )}
          </motion.div>

          {/* Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:text-white transition"
            title="Command Palette (Cmd+K)"
          >
            <Command className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Cmd K</span>
          </button>

          {/* Export Modal Trigger */}
          {isUnlocked && (
            <button
              onClick={onOpenExportModal}
              className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-slate-300 hover:border-slate-700 hover:text-white transition"
              title="Data Export & Backup"
            >
              <Download className="h-4 w-4" />
            </button>
          )}

          {/* Dark/Light Toggle */}
          <button
            onClick={() => setIsLightMode(!isLightMode)}
            className="rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-slate-300 hover:border-slate-700 hover:text-white transition"
            title="Toggle Theme"
          >
            {isLightMode ? <Moon className="h-4 w-4 text-cyan-400" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>

          {/* Master Lock / Unlock Toggle */}
          {isUnlocked && (
            <button
              onClick={lockVault}
              className="flex items-center gap-1.5 rounded-lg bg-red-950/60 border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/60 transition"
              title="Lock Vault"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lock Vault</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
