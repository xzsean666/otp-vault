import { EncryptedVaultPayload, TotpAccount } from '../types/vault';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const PBKDF2_ITERATIONS = 250000;
export const SALT_BYTE_LENGTH = 16;
export const IV_BYTE_LENGTH = 12;

/**
 * Convert a Uint8Array to Base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert a Base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Generate a unique ID (RFC 4122 v4 UUID)
 */
export function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // Fallback if randomUUID is not available
  const bytes = generateRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Derive an AES-GCM 256-bit key from a password and salt using PBKDF2
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt TotpAccount array with user password into EncryptedVaultPayload
 */
export async function encryptVaultData(
  accounts: TotpAccount[],
  password: string
): Promise<EncryptedVaultPayload> {
  if (!password || password.trim().length === 0) {
    throw new Error('Master password cannot be empty');
  }

  const salt = generateRandomBytes(SALT_BYTE_LENGTH);
  const iv = generateRandomBytes(IV_BYTE_LENGTH);
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);

  const plaintext = encoder.encode(JSON.stringify(accounts));
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    plaintext
  );

  return {
    version: 1,
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertextBuffer)),
    iterations: PBKDF2_ITERATIONS,
    updatedAt: Date.now(),
  };
}

/**
 * Decrypt EncryptedVaultPayload using user password into TotpAccount array
 */
export async function decryptVaultData(
  payload: EncryptedVaultPayload,
  password: string
): Promise<TotpAccount[]> {
  if (!password) {
    throw new Error('Master password cannot be empty');
  }

  try {
    const salt = base64ToUint8Array(payload.salt);
    const iv = base64ToUint8Array(payload.iv);
    const ciphertext = base64ToUint8Array(payload.ciphertext);

    const key = await deriveKey(password, salt, payload.iterations || PBKDF2_ITERATIONS);

    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
      },
      key,
      ciphertext as unknown as BufferSource
    );
    const jsonStr = decoder.decode(decryptedBuffer);
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid vault payload format: accounts must be an array');
    }
    return parsed as TotpAccount[];
  } catch (err: any) {
    if (err.message && err.message.includes('format')) {
      throw err;
    }
    throw new Error('DECRYPTION_FAILED: 密码错误或数据已损坏');
  }
}
