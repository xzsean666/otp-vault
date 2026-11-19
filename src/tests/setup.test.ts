import { describe, it, expect } from 'vitest';

describe('Project Setup & Sanity Test', () => {
  it('should pass basic environment sanity check', () => {
    expect(true).toBe(true);
    expect(typeof window).toBe('undefined'); // In node test environment
  });

  it('should verify basic crypto availability in modern Node environment', () => {
    expect(globalThis.crypto).toBeDefined();
    expect(globalThis.crypto.subtle).toBeDefined();
  });
});
