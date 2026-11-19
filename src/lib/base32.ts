const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Clean and normalize a Base32 string:
 * - Strip whitespace, hyphens, and padding '='
 * - Convert to uppercase
 */
export function normalizeBase32(secret: string): string {
  if (!secret) return '';
  return secret.replace(/[\s\-_=]/g, '').toUpperCase();
}

/**
 * Validate whether a string is a valid RFC 4648 Base32 encoded string
 */
export function isValidBase32(secret: string): boolean {
  const normalized = normalizeBase32(secret);
  if (normalized.length === 0) return false;
  return /^[A-Z2-7]+$/.test(normalized);
}

/**
 * Decode an RFC 4648 Base32 string to Uint8Array
 */
export function base32ToUint8Array(secret: string): Uint8Array {
  const clean = normalizeBase32(secret);
  if (!isValidBase32(clean)) {
    throw new Error('Invalid Base32 secret string: contains illegal characters or is empty');
  }

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = RFC4648_ALPHABET.indexOf(clean[i]);
    if (val === -1) {
      throw new Error(`Invalid Base32 character: ${clean[i]}`);
    }
    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Encode a Uint8Array into an RFC 4648 Base32 string (without padding)
 */
export function uint8ArrayToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += RFC4648_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}
