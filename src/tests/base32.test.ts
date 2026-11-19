import { describe, it, expect } from 'vitest';
import {
  normalizeBase32,
  isValidBase32,
  base32ToUint8Array,
  uint8ArrayToBase32,
} from '../lib/base32';

describe('Base32 Engine (RFC 4648)', () => {
  it('should normalize spaces, lowercase and hyphens', () => {
    expect(normalizeBase32('jbsw y3dp-ehpk 3pxp===')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('should correctly validate Base32 strings', () => {
    expect(isValidBase32('JBSWY3DPEHPK3PXP')).toBe(true);
    expect(isValidBase32('234567')).toBe(true);
    expect(isValidBase32('0189')).toBe(false); // 0, 1, 8, 9 are invalid in RFC 4648 Base32
    expect(isValidBase32('!')).toBe(false);
    expect(isValidBase32('')).toBe(false);
  });

  it('should roundtrip encode and decode arbitrary bytes', () => {
    const raw = new Uint8Array([0, 1, 2, 255, 128, 64, 32, 16]);
    const encoded = uint8ArrayToBase32(raw);
    expect(isValidBase32(encoded)).toBe(true);
    const decoded = base32ToUint8Array(encoded);
    expect(decoded).toEqual(raw);
  });

  it('should decode known string correctly', () => {
    // "JBSWY3DPEHPK3PXP" is Base32 for ASCII "Hello!\xde\xad\xbe\xef"
    const bytes = base32ToUint8Array('JBSWY3DPEHPK3PXP');
    const text = new TextDecoder().decode(bytes.slice(0, 6));
    expect(text).toBe('Hello!');
  });
});
