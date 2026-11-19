import { describe, it, expect } from 'vitest';
import {
  encryptVaultData,
  decryptVaultData,
  deriveKey,
  generateRandomBytes,
  uint8ArrayToBase64,
  base64ToUint8Array,
  generateId,
} from '../lib/crypto';
import { TotpAccount } from '../types/vault';

describe('Web Crypto Engine', () => {
  const sampleAccounts: TotpAccount[] = [
    {
      id: generateId(),
      label: 'alice@example.com',
      issuer: 'GitHub',
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA-1',
      digits: 6,
      period: 30,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: generateId(),
      label: 'bob@work.com',
      issuer: 'AWS',
      secret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
      algorithm: 'SHA-256',
      digits: 8,
      period: 60,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  it('should convert uint8Array to base64 and back accurately', () => {
    const bytes = generateRandomBytes(32);
    const b64 = uint8ArrayToBase64(bytes);
    const roundtrip = base64ToUint8Array(b64);
    expect(roundtrip).toEqual(bytes);
  });

  it('should generate valid v4 UUIDs', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should derive AES-GCM crypto keys with PBKDF2', async () => {
    const salt = generateRandomBytes(16);
    const key = await deriveKey('strong-master-passphrase-123!', salt, 1000);
    expect(key).toBeDefined();
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('should encrypt and decrypt vault accounts successfully with the correct password', async () => {
    const password = 'my-secret-vault-password-8888';
    const encrypted = await encryptVaultData(sampleAccounts, password);

    expect(encrypted.version).toBe(1);
    expect(encrypted.ciphertext).toBeTruthy();
    expect(encrypted.salt).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();

    const decrypted = await decryptVaultData(encrypted, password);
    expect(decrypted).toEqual(sampleAccounts);
  });

  it('should reject decryption when the wrong password is provided', async () => {
    const correctPass = 'correct-password';
    const wrongPass = 'wrong-password';
    const encrypted = await encryptVaultData(sampleAccounts, correctPass);

    await expect(decryptVaultData(encrypted, wrongPass)).rejects.toThrow(
      /DECRYPTION_FAILED/
    );
  });
});
