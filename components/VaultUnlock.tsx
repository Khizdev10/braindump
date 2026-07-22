'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/context/AuthContext';
import { Lock, Fingerprint, KeyRound, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const VaultUnlock: React.FC = () => {
  const { isConfigured, setupVault, unlockVault, unlockWithBiometrics, webAuthnEnabled } = useAuth();

  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [enableBiometrics, setEnableBiometrics] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (passcode.length < 4) {
      setErrorMsg('Passcode must be at least 4 characters long');
      return;
    }

    if (passcode !== confirmPasscode) {
      setErrorMsg('Passcodes do not match');
      return;
    }

    setIsLoading(true);
    const ok = await setupVault(passcode, enableBiometrics);
    setIsLoading(false);

    if (!ok) {
      setErrorMsg('Failed to initialize zero-knowledge vault. Please try again.');
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!passcode) {
      setErrorMsg('Please enter your vault passcode');
      return;
    }

    setIsLoading(true);
    const ok = await unlockVault(passcode);
    setIsLoading(false);

    if (!ok) {
      setErrorMsg('Incorrect passcode. Encrypted payload decryption failed.');
    }
  };

  const handleBiometricUnlock = async () => {
    setErrorMsg('');
    setIsLoading(true);
    const ok = await unlockWithBiometrics();
    setIsLoading(false);

    if (!ok) {
      setErrorMsg('Biometric verification failed. Please use your passcode.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl glass-panel p-6 sm:p-8 shadow-2xl border border-slate-800"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-6 glow-cyan">
          <Lock className="h-8 w-8" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isConfigured ? 'Unlock MindSpill Vault' : 'Create Master Passcode'}
          </h2>
          <p className="text-xs text-slate-400 mt-1.5">
            {isConfigured
              ? 'Your brain dumps are encrypted client-side with AES-GCM 256'
              : 'Setup your zero-knowledge encryption passcode to secure your local storage'}
          </p>
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5 flex items-center gap-2 rounded-xl bg-red-950/60 border border-red-800/60 p-3 text-xs text-red-300"
          >
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {!isConfigured ? (
          /* Setup Form */
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Master Passcode / PIN</label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  required
                />
                <KeyRound className="absolute right-3 top-3 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Master Passcode</label>
              <input
                type="password"
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/50 border border-slate-800 p-3">
              <input
                type="checkbox"
                id="bio-check"
                checked={enableBiometrics}
                onChange={(e) => setEnableBiometrics(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <label htmlFor="bio-check" className="text-xs text-slate-300 cursor-pointer flex items-center gap-1.5">
                <Fingerprint className="h-4 w-4 text-cyan-400" />
                Enable WebAuthn / Device Biometrics Unlock
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition disabled:opacity-50"
            >
              {isLoading ? 'Deriving Encryption Key...' : 'Initialize Zero-Knowledge Vault'}
            </button>
          </form>
        ) : (
          /* Unlock Form */
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Enter Vault Passcode</label>
              <div className="relative">
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <KeyRound className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20 transition disabled:opacity-50"
            >
              {isLoading ? 'Decrypting Vault...' : 'Unlock Vault'}
            </button>

            {webAuthnEnabled && (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition"
              >
                <Fingerprint className="h-4 w-4 text-cyan-400" />
                Unlock with Touch ID / Face ID
              </button>
            )}
          </form>
        )}

        <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>PBKDF2 Key Derivation + AES-GCM 256 Local Encryption</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
