import { TotpAccount, TotpAlgorithm } from '../types/vault';
import { normalizeAlgorithm } from './totp';
import { normalizeBase32, isValidBase32 } from './base32';

export interface ParsedOtpauth {
  type: 'totp' | 'hotp';
  label: string;
  issuer?: string;
  secret: string;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
}

/**
 * Parse an otpauth:// URI into structured fields
 */
export function parseOtpauthUri(rawUri: string): ParsedOtpauth {
  const trimmed = rawUri.trim();
  if (!trimmed.toLowerCase().startsWith('otpauth://')) {
    throw new Error('Invalid URI: must start with otpauth://');
  }

  const url = new URL(trimmed);
  const type = url.host.toLowerCase();
  if (type !== 'totp') {
    throw new Error(`Unsupported OTP type "${type}". Only TOTP is supported.`);
  }

  // Path starts with '/', remove leading '/'
  const rawPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  let issuerFromPath: string | undefined;
  let label = rawPath;

  if (rawPath.includes(':')) {
    const parts = rawPath.split(':');
    issuerFromPath = parts[0].trim();
    label = parts.slice(1).join(':').trim();
  }

  const params = url.searchParams;
  const rawSecret = params.get('secret') || '';
  const secret = normalizeBase32(rawSecret);

  if (!secret) {
    throw new Error('Invalid URI: missing required "secret" parameter');
  }
  if (!isValidBase32(secret)) {
    throw new Error('Invalid URI: "secret" is not a valid Base32 string');
  }

  const issuerFromQuery = params.get('issuer')?.trim();
  const issuer = issuerFromQuery || issuerFromPath || undefined;

  const rawAlgo = params.get('algorithm') || 'SHA-1';
  const algorithm = normalizeAlgorithm(rawAlgo);

  const rawDigits = params.get('digits');
  const digits = rawDigits ? parseInt(rawDigits, 10) : 6;
  const safeDigits = isNaN(digits) || digits < 4 || digits > 10 ? 6 : digits;

  const rawPeriod = params.get('period');
  const period = rawPeriod ? parseInt(rawPeriod, 10) : 30;
  const safePeriod = isNaN(period) || period <= 0 ? 30 : period;

  return {
    type: 'totp',
    label: label || 'Account',
    issuer,
    secret,
    algorithm,
    digits: safeDigits,
    period: safePeriod,
  };
}

/**
 * Format a TotpAccount into a standard otpauth:// URI
 */
export function buildOtpauthUri(account: Pick<TotpAccount, 'label' | 'issuer' | 'secret' | 'algorithm' | 'digits' | 'period'>): string {
  const cleanSecret = normalizeBase32(account.secret);
  const issuer = account.issuer?.trim();
  const label = account.label?.trim() || 'Account';

  // Construct label part: [issuer:]label
  const fullLabel = issuer ? `${issuer}:${label}` : label;
  const encodedLabel = encodeURIComponent(fullLabel);

  const params = new URLSearchParams();
  params.set('secret', cleanSecret);

  if (issuer) {
    params.set('issuer', issuer);
  }

  // Algorithm: SHA1, SHA256, SHA512 (standard format in URIs without hyphens)
  const algoName = (account.algorithm || 'SHA-1').replace('-', '');
  if (algoName !== 'SHA1') {
    params.set('algorithm', algoName);
  }

  if (account.digits && account.digits !== 6) {
    params.set('digits', account.digits.toString());
  }

  if (account.period && account.period !== 30) {
    params.set('period', account.period.toString());
  }

  return `otpauth://totp/${encodedLabel}?${params.toString()}`;
}
