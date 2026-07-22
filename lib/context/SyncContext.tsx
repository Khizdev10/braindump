'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../db';

interface SyncContextType {
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline' | 'pending';
  pendingQueueCount: number;
  triggerManualSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'pending'>('synced');
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  // Reconcile and process mutations queue
  const processSyncQueue = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    try {
      const pendingItems = await db.syncQueue.where('status').equals('pending').toArray();
      setPendingQueueCount(pendingItems.length);

      if (pendingItems.length === 0) {
        setSyncStatus('synced');
        return;
      }

      setSyncStatus('syncing');

      // Process queued mutations (Simulating Cloud Sync Reconciler for Supabase/Firebase hook)
      for (const item of pendingItems) {
        // Mock 100ms sync reconciliation per mutation
        await new Promise((res) => setTimeout(res, 100));
        await db.syncQueue.update(item.id, { status: 'synced' });
      }

      const remaining = await db.syncQueue.where('status').equals('pending').count();
      setPendingQueueCount(remaining);
      setSyncStatus(remaining === 0 ? 'synced' : 'pending');
    } catch (err) {
      console.error('Error during background sync processing:', err);
      setSyncStatus('pending');
    }
  }, []);

  // Listen to network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processSyncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      processSyncQueue();
    } else {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processSyncQueue]);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        syncStatus,
        pendingQueueCount,
        triggerManualSync: processSyncQueue,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
