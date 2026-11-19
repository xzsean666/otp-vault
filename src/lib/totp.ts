import { TotpAlgorithm } from '../types/vault';
import { base32ToUint8Array } from './base32';

export interface TotpOptions {
  algorithm?: TotpAlgorithm;
  digits?: number;
  period?: number;
  timestamp?: number; // In milliseconds or seconds; if > 1e11 treated as ms, else sec
  t0?: number;
}

/**
 * Format raw algorithm name into standard Web Crypto format
 */
export function normalizeAlgorithm(algo?: string): TotpAlgorithm {
  if (!algo) return 'SHA-1';
  const upper = algo.toUpperCase().replace(/[\-_]/g, '');
  if (upper === 'SHA256') return 'SHA-256';
  if (upper === 'SHA512') return 'SHA-512';
  return 'SHA-1';
}

/**
 * Calculate the time remaining and fractional progress in current time-step
 */
export function getTotpTimeRemaining(
  period = 30,
  timestampMs = Date.now()
): { remaining: number; progress: number } {
  const currentSec = Math.floor(timestampMs / 1000);
  const elapsed = currentSec % period;
  const remaining = period - elapsed;
  const progress = remaining / period; // 1.0 at start of window, approaches 0 at end
  return { remaining, progress };
}

/**
 * Generate TOTP code compliant with RFC 6238 and RFC 4226
 *
 * @param secret Base32 string or raw key bytes (Uint8Array)
 * @param options Calculation options
 */
export async function generateTotp(
  secret: string | Uint8Array,
  options: TotpOptions = {}
): Promise<string> {
  const algorithm = normalizeAlgorithm(options.algorithm);
  const rawDigits = options.digits || 6;
  const digits = isNaN(rawDigits) || rawDigits < 4 || rawDigits > 10 ? 6 : Math.floor(rawDigits);
  const rawPeriod = options.period || 30;
  const period = isNaN(rawPeriod) || rawPeriod <= 0 ? 30 : Math.floor(rawPeriod);
  const t0 = options.t0 || 0;

  // Resolve timestamp to seconds
  let timeSec: number;
  if (options.timestamp !== undefined) {
    timeSec = options.timestamp > 1e11 ? Math.floor(options.timestamp / 1000) : Math.floor(options.timestamp);
  } else {
    timeSec = Math.floor(Date.now() / 1000);
  }

  // Calculate counter T
  const counter = Math.floor((timeSec - t0) / period);

  // Convert counter into 8-byte big-endian buffer
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(counter), false);

  // Key bytes
  const keyBytes = typeof secret === 'string' ? base32ToUint8Array(secret) : secret;

  // Web Crypto HMAC
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    {
      name: 'HMAC',
      hash: { name: algorithm },
    },
    false,
    ['sign']
  );

  const signature = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, buffer);
  const hmac = new Uint8Array(signature);

  // RFC 4226 Dynamic Truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}
