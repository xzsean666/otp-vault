import { describe, it, expect } from 'vitest';
import { parseOtpauthUri, buildOtpauthUri } from '../lib/otpauth';
import { TotpAccount } from '../types/vault';

describe('otpauth URI Parser & Serializer', () => {
  it('should parse standard Google Authenticator URI format', () => {
    const uri =
      'otpauth://totp/GitHub:alice%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA1&digits=6&period=30';
    const parsed = parseOtpauthUri(uri);

    expect(parsed.label).toBe('alice@example.com');
    expect(parsed.issuer).toBe('GitHub');
    expect(parsed.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(parsed.algorithm).toBe('SHA-1');
    expect(parsed.digits).toBe(6);
    expect(parsed.period).toBe(30);
  });

  it('should parse URI without explicit issuer query param if in label', () => {
    const uri = 'otpauth://totp/Google:john.doe@gmail.com?secret=HXDMVJECJJWSRB3H';
    const parsed = parseOtpauthUri(uri);

    expect(parsed.issuer).toBe('Google');
    expect(parsed.label).toBe('john.doe@gmail.com');
    expect(parsed.secret).toBe('HXDMVJECJJWSRB3H');
    expect(parsed.digits).toBe(6);
    expect(parsed.period).toBe(30);
  });

  it('should parse URI with SHA256 and 8 digits', () => {
    const uri =
      'otpauth://totp/AWS:admin?secret=JBSWY3DPEHPK3PXP&algorithm=SHA256&digits=8&period=60';
    const parsed = parseOtpauthUri(uri);

    expect(parsed.algorithm).toBe('SHA-256');
    expect(parsed.digits).toBe(8);
    expect(parsed.period).toBe(60);
  });

  it('should throw on invalid protocol or missing secret', () => {
    expect(() => parseOtpauthUri('https://example.com')).toThrow();
    expect(() => parseOtpauthUri('otpauth://totp/Label?issuer=Test')).toThrow(/missing required "secret"/i);
  });

  it('should roundtrip build and parse URI', () => {
    const account: TotpAccount = {
      id: 'test-id',
      label: 'jane@company.com',
      issuer: 'Cloudflare',
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA-256',
      digits: 8,
      period: 45,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const uri = buildOtpauthUri(account);
    const parsed = parseOtpauthUri(uri);

    expect(parsed.label).toBe(account.label);
    expect(parsed.issuer).toBe(account.issuer);
    expect(parsed.secret).toBe(account.secret);
    expect(parsed.algorithm).toBe(account.algorithm);
    expect(parsed.digits).toBe(account.digits);
    expect(parsed.period).toBe(account.period);
  });
});
