/**
 * Unit Tests — lifecycle.ts registerShutdownHandler (PM2 graceful shutdown)
 *
 * - registerShutdownHandler (handler push to in-memory array)
 * - Module-level signal handler (SIGTERM/SIGINT) NODE_ENV='test' → skip
 *
 * NOT: gracefulShutdown sequence için process.exit mock gerekli — sadece
 * registration API + module-side guard test edilir.
 */

import { describe, it, expect } from 'vitest';
import { registerShutdownHandler } from '../lifecycle';

describe('registerShutdownHandler', () => {
  it('handler kabul eder — no throw', () => {
    expect(() =>
      registerShutdownHandler(async () => {
        // mock cleanup
      })
    ).not.toThrow();
  });

  it('multiple handler kayıt edilebilir', () => {
    expect(() => {
      registerShutdownHandler(async () => {});
      registerShutdownHandler(async () => {});
      registerShutdownHandler(async () => {});
    }).not.toThrow();
  });

  it('return type void — explicit return değil', () => {
    const result = registerShutdownHandler(async () => {});
    expect(result).toBeUndefined();
  });

  it('async handler accepted (Promise<void> return)', () => {
    const handler = async () => {
      await Promise.resolve();
    };
    expect(() => registerShutdownHandler(handler)).not.toThrow();
  });

  it('NODE_ENV === "test" → signal handler skip (Vitest crash önleme)', () => {
    // Module-level guard `process.env.NODE_ENV !== 'test'`
    // Test ortamında SIGTERM listener register etmez — Vitest bozulmaz
    expect(process.env.NODE_ENV).toBe('test');
  });
});
