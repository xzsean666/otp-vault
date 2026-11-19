import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { TotpAccount } from '../types/vault';
import {
  encryptVaultData,
  decryptVaultData,
  generateId,
} from '../lib/crypto';
import {
  hasVault,
  saveEncryptedVault,
  loadEncryptedVault,
  clearVault,
} from '../lib/storage';

export type VaultStatus = 'loading' | 'not-initialized' | 'locked' | 'unlocked';

interface VaultContextType {
  status: VaultStatus;
  accounts: TotpAccount[];
  autoLockMinutes: number;
  remainingLockSeconds: number;
  setupVault: (password: string) => Promise<void>;
  unlockVault: (password: string) => Promise<boolean>;
  lockVault: () => void;
  addAccount: (
    account: Omit<TotpAccount, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateAccount: (id: string, updates: Partial<TotpAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  importAccounts: (
    newAccounts: Array<Omit<TotpAccount, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<{ added: number; skipped: number }>;
  resetEntireVault: () => Promise<void>;
  setAutoLockMinutes: (minutes: number) => void;
  resetInactivityTimer: (minutesOverride?: number) => void;
}

const VaultContext = createContext<VaultContextType | null>(null);

const STORAGE_KEY_AUTOLOCK = 'otp_vault_autolock_min';

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<VaultStatus>('loading');
  const [accounts, setAccounts] = useState<TotpAccount[]>([]);

  // Auto lock settings
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUTOLOCK);
    const parsed = saved ? parseInt(saved, 10) : 15;
    return isNaN(parsed) ? 15 : parsed;
  });

  const [remainingLockSeconds, setRemainingLockSeconds] = useState<number>(
    autoLockMinutes * 60
  );

  const lastActivityRef = useRef<number>(Date.now());
  const accountsRef = useRef<TotpAccount[]>([]);
  accountsRef.current = accounts;
  const passwordRef = useRef<string | null>(null);

  // Check if vault exists on mount
  useEffect(() => {
    async function checkInit() {
      try {
        const exists = await hasVault();
        if (exists) {
          setStatus('locked');
        } else {
          setStatus('not-initialized');
        }
      } catch (err) {
        console.error('Error checking vault state:', err);
        setStatus('not-initialized');
      }
    }
    checkInit();
  }, []);

  const lockVault = useCallback(() => {
    // Memory sanitization: Clear sensitive decrypted state immediately
    setAccounts([]);
    passwordRef.current = null;
    accountsRef.current = [];
    setStatus('locked');
  }, []);

  const resetInactivityTimer = useCallback((minutesOverride?: number) => {
    lastActivityRef.current = Date.now();
    const mins = minutesOverride !== undefined ? minutesOverride : autoLockMinutes;
    setRemainingLockSeconds(mins * 60);
  }, [autoLockMinutes]);

  const setAutoLockMinutes = (minutes: number) => {
    setAutoLockMinutesState(minutes);
    localStorage.setItem(STORAGE_KEY_AUTOLOCK, minutes.toString());
    resetInactivityTimer(minutes);
  };

  // Activity listeners for auto lock
  useEffect(() => {
    if (status !== 'unlocked' || autoLockMinutes <= 0) return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    const interval = setInterval(() => {
      const elapsedSec = Math.floor(
        (Date.now() - lastActivityRef.current) / 1000
      );
      const totalSec = autoLockMinutes * 60;
      const left = Math.max(0, totalSec - elapsedSec);
      setRemainingLockSeconds(left);

      if (left <= 0) {
        lockVault();
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(interval);
    };
  }, [status, autoLockMinutes, lockVault]);

  // Save current accounts state to IndexedDB encrypted with master password
  const persistVault = async (
    targetAccounts: TotpAccount[],
    pwd = passwordRef.current
  ) => {
    if (!pwd) throw new Error('Cannot persist without master password');
    const encrypted = await encryptVaultData(targetAccounts, pwd);
    await saveEncryptedVault(encrypted, targetAccounts.length);
  };

  const setupVault = async (password: string) => {
    if (!password || password.trim().length === 0) {
      throw new Error('Master password cannot be empty');
    }
    const initialAccounts: TotpAccount[] = [];
    await persistVault(initialAccounts, password);
    passwordRef.current = password;
    setAccounts(initialAccounts);
    setStatus('unlocked');
    resetInactivityTimer();
  };

  const unlockVault = async (password: string): Promise<boolean> => {
    const payload = await loadEncryptedVault();
    if (!payload) {
      throw new Error('No vault found to unlock');
    }

    try {
      const decrypted = await decryptVaultData(payload, password);
      passwordRef.current = password;
      setAccounts(decrypted);
      setStatus('unlocked');
      resetInactivityTimer();
      return true;
    } catch {
      return false;
    }
  };

  const addAccount = async (
    newAcc: Omit<TotpAccount, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const now = Date.now();
    const account: TotpAccount = {
      ...newAcc,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [account, ...accountsRef.current];
    await persistVault(updated);
    setAccounts(updated);
  };

  const updateAccount = async (id: string, updates: Partial<TotpAccount>) => {
    const updated = accountsRef.current.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...updates,
          updatedAt: Date.now(),
        };
      }
      return item;
    });
    await persistVault(updated);
    setAccounts(updated);
  };

  const deleteAccount = async (id: string) => {
    const updated = accountsRef.current.filter((item) => item.id !== id);
    await persistVault(updated);
    setAccounts(updated);
  };

  const toggleFavorite = async (id: string) => {
    const updated = accountsRef.current.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          favorite: !item.favorite,
          updatedAt: Date.now(),
        };
      }
      return item;
    });
    await persistVault(updated);
    setAccounts(updated);
  };

  const importAccounts = async (
    newAccounts: Array<Omit<TotpAccount, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ added: number; skipped: number }> => {
    let added = 0;
    let skipped = 0;
    const current = [...accountsRef.current];
    const now = Date.now();

    for (const item of newAccounts) {
      // Avoid duplicate secrets if same issuer & label
      const exists = current.some(
        (c) =>
          c.secret === item.secret &&
          (c.issuer || '').toLowerCase() === (item.issuer || '').toLowerCase() &&
          c.label.toLowerCase() === item.label.toLowerCase()
      );

      if (exists) {
        skipped++;
      } else {
        current.unshift({
          ...item,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        });
        added++;
      }
    }

    if (added > 0) {
      await persistVault(current);
      setAccounts(current);
    }

    return { added, skipped };
  };

  const resetEntireVault = async () => {
    await clearVault();
    setAccounts([]);
    passwordRef.current = null;
    accountsRef.current = [];
    setStatus('not-initialized');
  };

  return (
    <VaultContext.Provider
      value={{
        status,
        accounts,
        autoLockMinutes,
        remainingLockSeconds,
        setupVault,
        unlockVault,
        lockVault,
        addAccount,
        updateAccount,
        deleteAccount,
        toggleFavorite,
        importAccounts,
        resetEntireVault,
        setAutoLockMinutes,
        resetInactivityTimer,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export function useVault(): VaultContextType {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return ctx;
}
