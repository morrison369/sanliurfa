import { describe, it, expect } from 'vitest';
import { validateWithSchema } from '../validation';

describe('Validation', () => {
  it('should validate email format', () => {
    const schema = {
      email: { type: 'string', required: true, pattern: '^[^@]+@[^@]+\.[^@]+$' }
    };

    const validResult = validateWithSchema({ email: 'test@example.com' }, schema as any);
    expect(validResult.valid).toBe(true);

    const invalidResult = validateWithSchema({ email: 'invalid-email' }, schema as any);
    expect(invalidResult.valid).toBe(false);
  });

  it('should validate password strength', () => {
    const schema = {
      password: { type: 'string', required: true, minLength: 8 }
    };

    const validResult = validateWithSchema({ password: 'StrongPass123!' }, schema as any);
    expect(validResult.valid).toBe(true);

    const invalidResult = validateWithSchema({ password: 'weak' }, schema as any);
    expect(invalidResult.valid).toBe(false);
  });

  it('should validate required fields', () => {
    const schema = {
      name: { type: 'string', required: true }
    };

    const result = validateWithSchema({}, schema as any);
    expect(result.valid).toBe(false);
  });

  it('should validate number ranges', () => {
    const schema = {
      rating: { type: 'number', required: true, min: 1, max: 5 }
    };

    const validResult = validateWithSchema({ rating: 4 }, schema as any);
    expect(validResult.valid).toBe(true);

    const invalidResult = validateWithSchema({ rating: 10 }, schema as any);
    expect(invalidResult.valid).toBe(false);
  });
});
