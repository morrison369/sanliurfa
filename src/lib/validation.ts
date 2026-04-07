// Request validation utilities

import { sanitizeInput } from './api';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
  data?: any;
}

/**
 * Field validator function
 */
export type FieldValidator = (value: any) => boolean | string;

/**
 * Schema definition for validation
 */
export interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'email' | 'boolean' | 'array';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: FieldValidator;
    sanitize?: boolean;
  };
}

/**
 * Validate a single email
 */
export function validateEmail(email: any): boolean {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate password strength
 * Requires: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
 */
export function validatePassword(password: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }

  if (password.length < 8) {
    errors.push('Minimum 8 characters required');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter required');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter required');
  }

  if (!/\d/.test(password)) {
    errors.push('At least one number required');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('At least one special character required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a string field
 */
export function validateString(
  value: any,
  minLength: number = 1,
  maxLength: number = 255,
  pattern?: RegExp
): boolean {
  if (typeof value !== 'string') return false;
  if (value.length < minLength || value.length > maxLength) return false;
  if (pattern && !pattern.test(value)) return false;
  return true;
}

/**
 * Validate a number field
 */
export function validateNumber(value: any, min?: number, max?: number): boolean {
  if (typeof value !== 'number' || isNaN(value)) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * Validate with schema
 */
export function validateWithSchema(data: any, schema: ValidationSchema): ValidationResult {
  const errors: Record<string, string> = {};
  const validatedData: Record<string, any> = {};

  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];

    // Check required
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[key] = `${key} is required`;
      continue;
    }

    // Skip if not required and empty
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    switch (rules.type) {
      case 'email':
        if (!validateEmail(value)) {
          errors[key] = 'Invalid email format';
        } else if (rules.sanitize) {
          validatedData[key] = sanitizeInput(value);
        } else {
          validatedData[key] = value;
        }
        break;

      case 'string':
        if (!validateString(value, rules.minLength, rules.maxLength, rules.pattern)) {
          errors[key] = `Invalid string (length: ${rules.minLength}-${rules.maxLength})`;
        } else if (rules.sanitize) {
          validatedData[key] = sanitizeInput(value);
        } else {
          validatedData[key] = value;
        }
        break;

      case 'number':
        if (!validateNumber(value, rules.min, rules.max)) {
          errors[key] = `Invalid number (range: ${rules.min}-${rules.max})`;
        } else {
          validatedData[key] = value;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors[key] = 'Must be a boolean';
        } else {
          validatedData[key] = value;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors[key] = 'Must be an array';
        } else {
          validatedData[key] = value;
        }
        break;
    }

    // Custom validation
    if (rules.custom && !errors[key]) {
      const customResult = rules.custom(validatedData[key]);
      if (customResult !== true) {
        errors[key] = typeof customResult === 'string' ? customResult : 'Validation failed';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    data: Object.keys(errors).length === 0 ? validatedData : undefined
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * User login schema
   */
  login: {
    email: {
      type: 'email' as const,
      required: true
    },
    password: {
      type: 'string' as const,
      required: true,
      minLength: 1
    }
  } as ValidationSchema,

  /**
   * User registration schema
   */
  register: {
    email: {
      type: 'email' as const,
      required: true
    },
    password: {
      type: 'string' as const,
      required: true,
      minLength: 8
    },
    full_name: {
      type: 'string' as const,
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true
    }
  } as ValidationSchema,

  /**
   * Review creation schema
   */
  review: {
    placeId: {
      type: 'string' as const,
      required: true
    },
    rating: {
      type: 'number' as const,
      required: true,
      min: 1,
      max: 5
    },
    content: {
      type: 'string' as const,
      required: true,
      minLength: 10,
      maxLength: 1000,
      sanitize: true
    },
    title: {
      type: 'string' as const,
      required: false,
      minLength: 3,
      maxLength: 100,
      sanitize: true
    }
  } as ValidationSchema,

  /**
   * Place creation/update schema
   */
  place: {
    name: {
      type: 'string' as const,
      required: true,
      minLength: 2,
      maxLength: 255,
      sanitize: true
    },
    description: {
      type: 'string' as const,
      required: true,
      minLength: 10,
      maxLength: 2000,
      sanitize: true
    },
    category: {
      type: 'string' as const,
      required: true,
      minLength: 2,
      maxLength: 50
    },
    address: {
      type: 'string' as const,
      required: true,
      minLength: 5,
      maxLength: 255,
      sanitize: true
    }
  } as ValidationSchema
};
