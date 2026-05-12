/**
 * Unit Tests — Form Errors helpers
 *
 * Pure helpers for form validation UI — no DB/network mocks.
 * Used in React form components for client-side validation.
 */

import { describe, it, expect } from 'vitest';
import {
  addFieldError,
  removeFieldError,
  clearErrors,
  hasError,
  hasErrors,
  getErrorMessage,
  getAllErrorMessages,
  apiErrorsToFormErrors,
  validators,
  validateForm,
  type FormErrors,
} from '../form-errors';

describe('addFieldError', () => {
  it('adds error to empty errors', () => {
    const result = addFieldError({}, 'email', 'Required');
    expect(result).toEqual({ email: ['Required'] });
  });

  it('appends to existing field errors', () => {
    const existing: FormErrors = { email: ['Required'] };
    const result = addFieldError(existing, 'email', 'Invalid format');
    expect(result.email).toEqual(['Required', 'Invalid format']);
  });

  it('does not mutate original errors', () => {
    const original: FormErrors = { email: ['err1'] };
    addFieldError(original, 'email', 'err2');
    expect(original).toEqual({ email: ['err1'] });
  });
});

describe('removeFieldError', () => {
  it('removes field from errors', () => {
    const errors: FormErrors = { email: ['err'], password: ['err'] };
    expect(removeFieldError(errors, 'email')).toEqual({ password: ['err'] });
  });

  it('returns same shape if field not present', () => {
    const errors: FormErrors = { email: ['err'] };
    expect(removeFieldError(errors, 'password')).toEqual({ email: ['err'] });
  });
});

describe('clearErrors', () => {
  it('returns empty errors object', () => {
    expect(clearErrors()).toEqual({});
  });
});

describe('hasError / hasErrors', () => {
  it('hasError true when field has errors', () => {
    expect(hasError({ email: ['err'] }, 'email')).toBe(true);
  });

  it('hasError false when field empty/missing', () => {
    expect(hasError({}, 'email')).toBe(false);
    expect(hasError({ email: [] }, 'email')).toBe(false);
  });

  it('hasErrors true when any field has errors', () => {
    expect(hasErrors({ email: ['err'] })).toBe(true);
  });

  it('hasErrors false on empty object', () => {
    expect(hasErrors({})).toBe(false);
  });
});

describe('getErrorMessage / getAllErrorMessages', () => {
  it('getErrorMessage returns first error', () => {
    expect(getErrorMessage({ email: ['err1', 'err2'] }, 'email')).toBe('err1');
  });

  it('getErrorMessage returns undefined when none', () => {
    expect(getErrorMessage({}, 'email')).toBeUndefined();
  });

  it('getAllErrorMessages flattens all errors', () => {
    const errors: FormErrors = {
      email: ['err1', 'err2'],
      password: ['err3'],
    };
    expect(getAllErrorMessages(errors)).toEqual(['err1', 'err2', 'err3']);
  });
});

describe('apiErrorsToFormErrors', () => {
  it('maps {data: {errors: {field: [msgs]}}} structure', () => {
    const apiResp = {
      data: { errors: { email: ['Invalid'], password: ['Too short'] } },
    };
    const result = apiErrorsToFormErrors(apiResp);
    expect(result.email).toEqual(['Invalid']);
    expect(result.password).toEqual(['Too short']);
  });

  it('coerces string error message to array', () => {
    const apiResp = { data: { errors: { email: 'Invalid' } } };
    const result = apiErrorsToFormErrors(apiResp);
    expect(result.email).toEqual(['Invalid']);
  });

  it('falls back to data.message → general field', () => {
    const apiResp = { data: { message: 'Server error occurred' } };
    const result = apiErrorsToFormErrors(apiResp);
    expect(result.general).toEqual(['Server error occurred']);
  });

  it('falls back to statusText → general field', () => {
    const apiResp = { statusText: 'Internal Server Error' };
    const result = apiErrorsToFormErrors(apiResp);
    expect(result.general).toEqual(['Internal Server Error']);
  });

  it('returns empty errors for unknown response shape', () => {
    expect(apiErrorsToFormErrors({})).toEqual({});
  });
});

describe('validators', () => {
  describe('email', () => {
    it('rejects empty', () => {
      expect(validators.email('')).toBe('Email alanı zorunludur');
    });
    it('rejects malformed', () => {
      expect(validators.email('not-email')).toBe('Geçerli bir email girin');
      expect(validators.email('a@b')).toBe('Geçerli bir email girin');
    });
    it('accepts valid email', () => {
      expect(validators.email('a@b.co')).toBeUndefined();
      expect(validators.email('user.name+tag@example.com')).toBeUndefined();
    });
  });

  describe('password', () => {
    it('rejects empty', () => {
      expect(validators.password('')).toBe('Şifre alanı zorunludur');
    });
    it('rejects <8 chars', () => {
      expect(validators.password('Abc1!')).toBe('Şifre en az 8 karakter olmalıdır');
    });
    it('requires uppercase', () => {
      expect(validators.password('lowercase1!')).toContain('büyük harf');
    });
    it('requires digit', () => {
      expect(validators.password('NoDigits!')).toContain('rakam');
    });
    it('requires special char', () => {
      expect(validators.password('NoSpecial1')).toContain('özel karakter');
    });
    it('accepts strong password', () => {
      expect(validators.password('StrongPass1!')).toBeUndefined();
    });
  });

  describe('required', () => {
    it('rejects empty/whitespace-only', () => {
      expect(validators.required('')).toBe('Bu alan zorunludur');
      expect(validators.required('   ')).toBe('Bu alan zorunludur');
    });
    it('uses custom field name', () => {
      expect(validators.required('', 'Email')).toBe('Email zorunludur');
    });
    it('accepts non-empty', () => {
      expect(validators.required('value')).toBeUndefined();
    });
  });

  describe('minLength / maxLength', () => {
    it('minLength rejects short value', () => {
      expect(validators.minLength('ab', 5)).toContain('en az 5');
    });
    it('minLength accepts equal/longer', () => {
      expect(validators.minLength('abcde', 5)).toBeUndefined();
    });
    it('minLength skips empty value', () => {
      expect(validators.minLength('', 5)).toBeUndefined();
    });
    it('maxLength rejects long value', () => {
      expect(validators.maxLength('abcdef', 3)).toContain('en çok 3');
    });
    it('maxLength accepts equal/shorter', () => {
      expect(validators.maxLength('abc', 5)).toBeUndefined();
    });
  });

  describe('phone', () => {
    it('rejects empty', () => {
      expect(validators.phone('')).toBe('Telefon numarası zorunludur');
    });
    it('accepts Turkish format', () => {
      expect(validators.phone('05551234567')).toBeUndefined();
      expect(validators.phone('+905551234567')).toBeUndefined();
    });
    it('rejects invalid format', () => {
      expect(validators.phone('abc')).toContain('Geçerli');
      expect(validators.phone('123')).toContain('Geçerli');
    });
  });

  describe('url', () => {
    it('accepts valid URL', () => {
      expect(validators.url('https://example.com')).toBeUndefined();
      expect(validators.url('http://localhost:3000/path?q=1')).toBeUndefined();
    });
    it('rejects malformed URL', () => {
      expect(validators.url('not a url')).toContain('Geçerli');
      expect(validators.url('://broken')).toContain('Geçerli');
    });
  });

  describe('match', () => {
    it('returns undefined when values match', () => {
      expect(validators.match('a', 'a')).toBeUndefined();
    });
    it('returns error when mismatch', () => {
      expect(validators.match('a', 'b')).toContain('eşleşmiyor');
    });
    it('uses custom field name', () => {
      expect(validators.match('a', 'b', 'Şifreler')).toContain('Şifreler');
    });
  });
});

describe('validateForm', () => {
  it('returns empty errors when all valid', () => {
    const data = { email: 'a@b.co', password: 'StrongPass1!' };
    const schema = {
      email: validators.email,
      password: validators.password,
    };
    expect(validateForm(data, schema)).toEqual({});
  });

  it('returns errors for failing fields', () => {
    const data = { email: '', password: 'short' };
    const schema = {
      email: validators.email,
      password: validators.password,
    };
    const errors = validateForm(data, schema);
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });

  it('skips fields not in schema', () => {
    const data = { email: 'a@b.co', extra: 'ignored' };
    const errors = validateForm(data, { email: validators.email });
    expect(errors.extra).toBeUndefined();
  });
});
