/**
 * Unit Tests — Logger
 *
 * Structured logging helper used across all lib modules and API endpoints.
 * Tests verify log level routing, context normalization, error handling polymorphism,
 * and request/performance/mutation helpers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, createRequestLogger } from '../logger';

describe('Logger', () => {
  let consoleSpies: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpies = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log level routing', () => {
    it('debug routes to console.debug (skipped in production)', () => {
      logger.debug('debug message');
      // In test env (NODE_ENV !== 'production'), debug logs through
      expect(consoleSpies.debug).toHaveBeenCalled();
    });

    it('info routes to console.info', () => {
      logger.info('info message');
      expect(consoleSpies.info).toHaveBeenCalled();
    });

    it('warn routes to console.warn', () => {
      logger.warn('warn message');
      expect(consoleSpies.warn).toHaveBeenCalled();
    });

    it('error routes to console.error', () => {
      logger.error('error message');
      expect(consoleSpies.error).toHaveBeenCalled();
    });

    it('fatal routes to console.error', () => {
      logger.fatal('fatal message');
      expect(consoleSpies.error).toHaveBeenCalled();
    });
  });

  describe('message formatting', () => {
    it('includes ISO timestamp', () => {
      logger.info('test');
      const call = consoleSpies.info.mock.calls[0][0] as string;
      expect(call).toMatch(/^\[\d{4}-\d{2}-\d{2}T/);
    });

    it('includes uppercase log level', () => {
      logger.info('test');
      const call = consoleSpies.info.mock.calls[0][0] as string;
      expect(call).toContain('INFO:');
    });

    it('includes message text', () => {
      logger.warn('special-warning-marker');
      const call = consoleSpies.warn.mock.calls[0][0] as string;
      expect(call).toContain('special-warning-marker');
    });

    it('serializes context object as JSON', () => {
      logger.info('test', { userId: 'u123', requestId: 'r456' });
      const call = consoleSpies.info.mock.calls[0][0] as string;
      expect(call).toContain('"userId":"u123"');
      expect(call).toContain('"requestId":"r456"');
    });

    it('coerces string context to {detail: ...}', () => {
      logger.info('test', 'extra detail');
      const call = consoleSpies.info.mock.calls[0][0] as string;
      expect(call).toContain('"detail":"extra detail"');
    });
  });

  describe('error overload polymorphism', () => {
    it('error(msg, Error) appends stack trace', () => {
      const err = new Error('boom');
      logger.error('failure', err);
      const call = consoleSpies.error.mock.calls[0][0] as string;
      expect(call).toContain('failure');
      expect(call).toContain('boom');
    });

    it('error(msg, Error, context) merges context', () => {
      const err = new Error('boom');
      logger.error('failure', err, { userId: 'u789' });
      const call = consoleSpies.error.mock.calls[0][0] as string;
      expect(call).toContain('"userId":"u789"');
    });

    it('error(msg, string) wraps string as Error', () => {
      logger.error('failure', 'plain string detail');
      const call = consoleSpies.error.mock.calls[0][0] as string;
      expect(call).toContain('failure');
      expect(call).toContain('plain string detail');
    });

    it('error(msg, contextObj) treats object as context', () => {
      logger.error('failure', { resource: 'place', id: '42' });
      const call = consoleSpies.error.mock.calls[0][0] as string;
      expect(call).toContain('"resource":"place"');
      expect(call).toContain('"id":"42"');
    });

    it('error(msg) (no extra args) does not throw', () => {
      expect(() => logger.error('just a message')).not.toThrow();
    });
  });

  describe('debug/info/warn with Error as 2nd arg', () => {
    it('info(msg, Error) attaches stack', () => {
      logger.info('soft-failure', new Error('details'));
      const call = consoleSpies.info.mock.calls[0][0] as string;
      expect(call).toContain('details');
    });

    it('warn(msg, Error) attaches stack', () => {
      logger.warn('soft-warning', new Error('details'));
      const call = consoleSpies.warn.mock.calls[0][0] as string;
      expect(call).toContain('details');
    });
  });

  describe('request helper', () => {
    it('logs 2xx as info', () => {
      logger.request('GET', '/api/places', 200, 45);
      expect(consoleSpies.info).toHaveBeenCalled();
      const call = consoleSpies.info.mock.calls[0][0] as string;
      expect(call).toContain('GET /api/places 200 - 45ms');
    });

    it('logs 4xx as warn', () => {
      logger.request('POST', '/api/auth', 401, 12);
      expect(consoleSpies.warn).toHaveBeenCalled();
    });

    it('logs 5xx as error', () => {
      logger.request('GET', '/api/x', 500, 200);
      expect(consoleSpies.error).toHaveBeenCalled();
    });
  });

  describe('performance helper', () => {
    it('logs <1000ms as info', () => {
      logger.performance('cache-warm', 250);
      expect(consoleSpies.info).toHaveBeenCalled();
      const call = consoleSpies.info.mock.calls[0][0] as string;
      expect(call).toContain('Performance: cache-warm took 250ms');
    });

    it('logs >1000ms as warn (slow operation)', () => {
      logger.performance('slow-query', 1500);
      expect(consoleSpies.warn).toHaveBeenCalled();
    });
  });

  describe('compat helpers', () => {
    it('logMutation logs as info with action/table/id', () => {
      logger.logMutation('create', 'places', 'pid-1', 'u-1');
      const call = consoleSpies.info.mock.calls[0][0] as string;
      expect(call).toContain('Mutation: create places pid-1');
      expect(call).toContain('"userId":"u-1"');
    });

    it('logQuery logs slow queries (>500ms) as warn', () => {
      logger.logQuery('SELECT * FROM places WHERE x = 1', 750);
      expect(consoleSpies.warn).toHaveBeenCalled();
    });

    it('logQuery skips fast queries (<500ms)', () => {
      logger.logQuery('SELECT * FROM places', 100);
      expect(consoleSpies.warn).not.toHaveBeenCalled();
    });

    it('logAuth logs auth event', () => {
      logger.logAuth('login', 'u-42', true);
      const call = consoleSpies.info.mock.calls[0][0] as string;
      expect(call).toContain('Auth: login user=u-42 success=true');
    });

    it('setRequestId is a no-op (does not throw)', () => {
      expect(() => logger.setRequestId('req-123')).not.toThrow();
    });
  });
});

describe('createRequestLogger', () => {
  let consoleSpies: {
    info: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpies = {
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('binds requestId/ip/userAgent to all log calls', () => {
    const reqLogger = createRequestLogger('req-1', '1.2.3.4', 'Mozilla/5.0');
    reqLogger.info('test');
    const call = consoleSpies.info.mock.calls[0][0] as string;
    expect(call).toContain('"requestId":"req-1"');
    expect(call).toContain('"ip":"1.2.3.4"');
    expect(call).toContain('"userAgent":"Mozilla/5.0"');
  });

  it('error binds requestId + error', () => {
    const reqLogger = createRequestLogger('req-2', '5.6.7.8', 'curl');
    const err = new Error('boom');
    reqLogger.error('failure', err);
    const call = consoleSpies.error.mock.calls[0][0] as string;
    expect(call).toContain('"requestId":"req-2"');
    expect(call).toContain('boom');
  });

  it('request method binds context with status code', () => {
    const reqLogger = createRequestLogger('req-3', '0.0.0.0', 'agent');
    reqLogger.request('GET', '/x', 200, 50);
    const call = consoleSpies.info.mock.calls[0][0] as string;
    expect(call).toContain('GET /x 200 - 50ms');
    expect(call).toContain('"requestId":"req-3"');
  });
});
