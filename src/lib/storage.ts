import { EncryptedVaultPayload, VaultMetadata } from '../types/vault';

const DB_NAME = 'otp_vault_db';
const DB_VERSION = 1;
const STORE_NAME = 'vault_data';
const KEY_PAYLOAD = 'encrypted_payload';
const KEY_METADATA = 'vault_metadata';

function getIndexedDB(): IDBFactory | null {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).indexedDB) {
    return (globalThis as any).indexedDB;
  }
  return null;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function closeDB(): void {
  if (dbPromise) {
    dbPromise
      .then((db) => {
        db.close();
        dbPromise = null;
      })
      .catch(() => {
        dbPromise = null;
      });
  }
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  const idb = getIndexedDB();
  if (!idb) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });

  return dbPromise;
}

/**
 * Save encrypted vault payload and update metadata in IndexedDB
 */
export async function saveEncryptedVault(
  payload: EncryptedVaultPayload,
  accountCount: number
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const metadata: VaultMetadata = {
      initialized: true,
      accountCount,
      updatedAt: payload.updatedAt,
    };

    store.put(payload, KEY_PAYLOAD);
    store.put(metadata, KEY_METADATA);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error('Failed to save vault data'));
    };
  });
}

/**
 * Load encrypted vault payload from IndexedDB
 */
export async function loadEncryptedVault(): Promise<EncryptedVaultPayload | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY_PAYLOAD);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to load encrypted vault'));
    };
  });
}

/**
 * Load vault metadata
 */
export async function loadVaultMetadata(): Promise<VaultMetadata | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(KEY_METADATA);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to load vault metadata'));
    };
  });
}

/**
 * Check if a vault has been initialized and exists in IndexedDB
 */
export async function hasVault(): Promise<boolean> {
  try {
    const idb = getIndexedDB();
    if (!idb) return false;
    const payload = await loadEncryptedVault();
    return !!payload;
  } catch {
    return false;
  }
}

/**
 * Completely wipe / delete the vault from IndexedDB
 */
export async function clearVault(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error('Failed to clear vault'));
    };
  });
}
