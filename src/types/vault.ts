export type TotpAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';

export interface TotpAccount {
  id: string;               // Unique ID (UUID or nanoid-like string)
  label: string;            // Account name / email (e.g. user@gmail.com)
  issuer?: string;          // Service provider (e.g. GitHub, Google, AWS)
  secret: string;           // Base32 secret key (normalized uppercase, no spaces)
  algorithm: TotpAlgorithm; // Hash algorithm: SHA-1, SHA-256, SHA-512
  digits: number;           // OTP code length (usually 6 or 8)
  period: number;           // Time-step in seconds (default 30)
  counter?: number;         // Optional counter for HOTP if ever needed
  tags?: string[];          // Categorization tags (e.g. Work, Personal)
  favorite?: boolean;       // Pinned to top
  createdAt: number;        // Timestamp (ms)
  updatedAt: number;        // Timestamp (ms)
}

export interface EncryptedVaultPayload {
  version: number;          // Data format version (1)
  salt: string;             // Base64 encoded PBKDF2 salt
  iv: string;               // Base64 encoded AES-GCM IV
  ciphertext: string;       // Base64 encoded encrypted JSON payload
  iterations: number;       // PBKDF2 iteration count (>= 250,000)
  updatedAt: number;        // Last updated timestamp
}

export interface VaultMetadata {
  initialized: boolean;
  accountCount: number;
  lastUnlockedAt?: number;
  updatedAt?: number;
}
