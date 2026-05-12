/**
 * Unit Tests — Error Handling helpers
 *
 * unknownToAppError, isAppError, createError, formatErrorForDisplay.
 * Pure helpers — no mocks needed.
 */

import { describe, it, expect } from 'vitest';
import {
  unknownToAppError,
  formatErrorForDisplay,
  isAppError,
  createError,
  httpStatusCodes,
  type AppError,
} from '../error-handling';

describe('unknownToAppError', () => {
  it('wraps Error instance preserving message', () => {
    const err = new Error('boom');
    const app = unknownToAppError(err);
    expect(app.code).toBe('UNKNOWN_ERROR');
    expect(app.message).toBe('boom');
    expect(app.originalError).toBe(err);
  });

  it('wraps string as message', () => {
    const app = unknownToAppError('plain text error');
    expect(app.code).toBe('UNKNOWN_ERROR');
    expect(app.message).toBe('plain text error');
    expect(app.originalError).toBeUndefined();
  });

  it('wraps object/array with default message + details', () => {
    const app = unknownToAppError({ foo: 'bar' });
    expect(app.code).toBe('UNKNOWN_ERROR');
    expect(app.message).toBe('An unexpected error occurred');
    expect(app.details).toEqual({ originalValue: { foo: 'bar' } });
  });

  it('wraps null', () => {
    const app = unknownToAppError(null);
    expect(app.code).toBe('UNKNOWN_ERROR');
    expect(app.message).toBe('An unexpected error occurred');
  });

  it('wraps number', () => {
    const app = unknownToAppError(42);
    expect(app.code).toBe('UNKNOWN_ERROR');
    expect(app.details?.originalValue).toBe(42);
  });

  it('wraps undefined', () => {
    const app = unknownToAppError(undefined);
    expect(app.code).toBe('UNKNOWN_ERROR');
    expect(app.message).toBe('An unexpected error occurred');
  });

  it('preserves Error subclass instances', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    const err = new CustomError('custom boom');
    const app = unknownToAppError(err);
    expect(app.message).toBe('custom boom');
    expect(app.originalError).toBe(err);
  });
});

describe('formatErrorForDisplay', () => {
  it('returns Türkçe error display info', () => {
    const info = formatErrorForDisplay(new Error('boom'));
    expect(info.title).toBe('Hata');
    expect(info.message).toBe('boom');
    expect(info.action).toBe('Tekrar Dene'); // UNKNOWN_ERROR triggers action
  });

  it('handles string error', () => {
    const info = formatErrorForDisplay('text error');
    expect(info.message).toBe('text error');
    expect(info.action).toBe('Tekrar Dene');
  });

  it('handles unknown object', () => {
    const info = formatErrorForDisplay({ foo: 1 });
    expect(info.title).toBe('Hata');
    expect(info.message).toBe('An unexpected error occurred');
  });
});

describe('isAppError', () => {
  it('returns true for AppError shape', () => {
    const err: AppError = { code: 'X', message: 'Y' };
    expect(isAppError(err)).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isAppError(new Error('boom'))).toBe(false);
  });

  it('returns false for string', () => {
    expect(isAppError('text')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
  });

  it('returns false for object without required fields', () => {
    expect(isAppError({ code: 'X' })).toBe(false); // missing message
    expect(isAppError({ message: 'Y' })).toBe(false); // missing code
    expect(isAppError({})).toBe(false);
  });
});

describe('createError', () => {
  it('builds AppError with code/message', () => {
    const err = createError('VAL_ERR', 'Validation failed');
    expect(err.code).toBe('VAL_ERR');
    expect(err.message).toBe('Validation failed');
    expect(err.details).toBeUndefined();
  });

  it('includes details when provided', () => {
    const err = createError('VAL_ERR', 'Failed', { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });

  it('omits details key when not provided', () => {
    const err = createError('X', 'Y');
    expect('details' in err).toBe(false);
  });

  it('result passes isAppError check', () => {
    const err = createError('X', 'Y');
    expect(isAppError(err)).toBe(true);
  });
});

describe('httpStatusCodes constants', () => {
  it('matches standard HTTP codes', () => {
    expect(httpStatusCodes.BAD_REQUEST).toBe(400);
    expect(httpStatusCodes.UNAUTHORIZED).toBe(401);
    expect(httpStatusCodes.FORBIDDEN).toBe(403);
    expect(httpStatusCodes.NOT_FOUND).toBe(404);
    expect(httpStatusCodes.CONFLICT).toBe(409);
    expect(httpStatusCodes.UNPROCESSABLE).toBe(422);
    expect(httpStatusCodes.INTERNAL_ERROR).toBe(500);
    expect(httpStatusCodes.SERVICE_UNAVAILABLE).toBe(503);
  });
});
