/**
 * Unit Tests — logging.ts re-export shape (backward compat shim)
 *
 * `logging.ts` sadece `export * from './logger'` + default logger.
 * Re-export contract — caller'lar `from '../logging'` veya `from '../logger'`
 * kullanıyor; test ile değişiklikleri yakala.
 */

import { describe, it, expect } from 'vitest';
import loggingDefault, { logger as loggingNamed } from '../logging';
import { logger as loggerNamed } from '../logger';

describe('logging.ts — backward compat shim', () => {
  it('default export === logger named export', () => {
    expect(loggingDefault).toBe(loggingNamed);
  });

  it('logging.logger === logger.logger (re-export aynı instance)', () => {
    expect(loggingNamed).toBe(loggerNamed);
  });

  it('logger.info/warn/error/debug — function exports', () => {
    expect(typeof loggingNamed.info).toBe('function');
    expect(typeof loggingNamed.warn).toBe('function');
    expect(typeof loggingNamed.error).toBe('function');
    expect(typeof loggingNamed.debug).toBe('function');
  });

  it('logger çağrısı throw etmez (smoke)', () => {
    expect(() => loggingNamed.debug('test message', { key: 'value' })).not.toThrow();
  });
});
