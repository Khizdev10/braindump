'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  deriveKey,
  deriveVerificationHash,
  generateSalt,
  bufferToBase64,
  base64ToBuffer,
  authenticateWebAuthn,
  registerWebAuthnCredential,
} from '../crypto/security';
import { db, type UserSecurityRecord } from '../db';

interface AuthContextType {
  isConfigured: boolean;
  isUnlocked: boolean;
  masterKey: CryptoKey | null;
  autoLockMinutes: number;
  webAuthnEnabled: boolean;
  setupVault: (passcode: string, enableBiometrics?: boolean) => Promise<boolean>;
  unlockVault: (passcode: string) => Promise<boolean>;
  unlockWithBiometrics: () => Promise<boolean>;
  lockVault: () => void;
  updateAutoLockTimer: (minutes: number) => Promise<void>;
  resetVault: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(5);
  const [webAuthnEnabled, setWebAuthnEnabled] = useState<boolean>(false);

  const securityRecordRef = useRef<UserSecurityRecord | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Vault is already set up on initial load
  const checkVaultConfig = useCallback(async () => {
    try {
      const record = await db.userSecurity.get('master');
      if (record) {
        setIsConfigured(true);
        securityRecordRef.current = record;
        setAutoLockMinutes(record.autoLockMinutes || 5);
        setWebAuthnEnabled(!!record.webAuthnCredentialId);
      } else {
        setIsConfigured(false);
      }
    } catch (err) {
      console.error('Error checking vault config:', err);
    }
  }, []);

  useEffect(() => {
    checkVaultConfig();
  }, [checkVaultConfig]);

  // Lock function
  const lockVault = useCallback(() => {
    setMasterKey(null);
    setIsUnlocked(false);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
  }, []);

  // Inactivity Sentinel
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (isUnlocked && autoLockMinutes > 0) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log(`Auto-locking vault due to ${autoLockMinutes} min inactivity`);
        lockVault();
      }, autoLockMinutes * 60 * 1000);
    }
  }, [isUnlocked, autoLockMinutes, lockVault]);

  // Listen to user activity (mouse movement, keypresses, touches)
  useEffect(() => {
    if (!isUnlocked) return;

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => resetInactivityTimer();

    activityEvents.forEach((event) => window.addEventListener(event, handleActivity));
    resetInactivityTimer();

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isUnlocked, resetInactivityTimer]);

  // First time Vault Setup
  const setupVault = async (passcode: string, enableBiometrics = false): Promise<boolean> => {
    try {
      const salt = generateSalt(16);
      const saltBase64 = bufferToBase64(salt.buffer);
      const verificationHash = await deriveVerificationHash(passcode, salt);
      const key = await deriveKey(passcode, salt);

      let webAuthnId: string | null = null;
      if (enableBiometrics) {
        webAuthnId = await registerWebAuthnCredential();
      }

      const record: UserSecurityRecord = {
        id: 'master',
        saltBase64,
        verificationHash,
        webAuthnCredentialId: webAuthnId,
        autoLockMinutes: 5,
        createdAt: Date.now(),
      };

      await db.userSecurity.put(record);
      securityRecordRef.current = record;

      setMasterKey(key);
      setIsConfigured(true);
      setIsUnlocked(true);
      setAutoLockMinutes(5);
      setWebAuthnEnabled(!!webAuthnId);
      return true;
    } catch (err) {
      console.error('Setup vault failed:', err);
      return false;
    }
  };

  // Unlock Vault with Passcode
  const unlockVault = async (passcode: string): Promise<boolean> => {
    try {
      let record = securityRecordRef.current;
      if (!record) {
        record = (await db.userSecurity.get('master')) || null;
      }
      if (!record) return false;

      const saltBuffer = new Uint8Array(base64ToBuffer(record.saltBase64));
      const testHash = await deriveVerificationHash(passcode, saltBuffer);

      if (testHash === record.verificationHash) {
        const key = await deriveKey(passcode, saltBuffer);
        setMasterKey(key);
        setIsUnlocked(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Unlock vault error:', err);
      return false;
    }
  };

  // Unlock Vault with WebAuthn Biometrics
  const unlockWithBiometrics = async (): Promise<boolean> => {
    try {
      let record = securityRecordRef.current;
      if (!record) {
        record = (await db.userSecurity.get('master')) || null;
      }
      if (!record || !record.webAuthnCredentialId) return false;

      const success = await authenticateWebAuthn(record.webAuthnCredentialId);
      if (success) {
        // Retrieve temporary key stored or fallback unlock
        // Note: For full zero-knowledge key derivation via biometrics, key can be stored in WebAuthn PRF extension or cached in sessionStorage
        const cachedKey = (window as unknown as { _tempSessionKey?: CryptoKey })._tempSessionKey;
        if (cachedKey) {
          setMasterKey(cachedKey);
          setIsUnlocked(true);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Biometric unlock failed:', err);
      return false;
    }
  };

  const updateAutoLockTimer = async (minutes: number) => {
    setAutoLockMinutes(minutes);
    const record = await db.userSecurity.get('master');
    if (record) {
      await db.userSecurity.update('master', { autoLockMinutes: minutes });
    }
  };

  const resetVault = async () => {
    await db.userSecurity.clear();
    await db.notes.clear();
    await db.tags.clear();
    await db.syncQueue.clear();
    lockVault();
    setIsConfigured(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isConfigured,
        isUnlocked,
        masterKey,
        autoLockMinutes,
        webAuthnEnabled,
        setupVault,
        unlockVault,
        unlockWithBiometrics,
        lockVault,
        updateAutoLockTimer,
        resetVault,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
