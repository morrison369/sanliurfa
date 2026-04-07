/**
 * Form error handling utilities
 */

export interface FormErrors {
  [fieldName: string]: string[];
}

/**
 * Add error to field
 */
export function addFieldError(errors: FormErrors, field: string, message: string): FormErrors {
  return {
    ...errors,
    [field]: [...(errors[field] || []), message]
  };
}

/**
 * Remove error from field
 */
export function removeFieldError(errors: FormErrors, field: string): FormErrors {
  const { [field]: _, ...rest } = errors;
  return rest;
}

/**
 * Clear all errors
 */
export function clearErrors(): FormErrors {
  return {};
}

/**
 * Check if field has error
 */
export function hasError(errors: FormErrors, field: string): boolean {
  return (errors[field]?.length ?? 0) > 0;
}

/**
 * Get first error message for field
 */
export function getErrorMessage(errors: FormErrors, field: string): string | undefined {
  return errors[field]?.[0];
}

/**
 * Convert API error response to form errors
 */
export function apiErrorsToFormErrors(response: any): FormErrors {
  const errors: FormErrors = {};

  if (response.data?.errors) {
    if (typeof response.data.errors === 'object') {
      // errors: { field: ['message1', 'message2'] }
      Object.entries(response.data.errors).forEach(([field, messages]) => {
        errors[field] = Array.isArray(messages) ? messages : [String(messages)];
      });
    } else {
      // Generic error
      errors.general = [response.data.errors];
    }
  } else if (response.data?.message) {
    errors.general = [response.data.message];
  } else if (response.statusText) {
    errors.general = [response.statusText];
  }

  return errors;
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get all error messages as flat array
 */
export function getAllErrorMessages(errors: FormErrors): string[] {
  return Object.values(errors).flat();
}

/**
 * Validation functions
 */
export const validators = {
  email: (value: string): string | undefined => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return 'Email alanı zorunludur';
    if (!emailRegex.test(value)) return 'Geçerli bir email girin';
    return undefined;
  },

  password: (value: string): string | undefined => {
    if (!value) return 'Şifre alanı zorunludur';
    if (value.length < 8) return 'Şifre en az 8 karakter olmalıdır';
    if (!/[A-Z]/.test(value)) return 'Şifre en az bir büyük harf içermelidir';
    if (!/[0-9]/.test(value)) return 'Şifre en az bir rakam içermelidir';
    if (!/[!@#$%^&*]/.test(value)) return 'Şifre en az bir özel karakter içermelidir';
    return undefined;
  },

  required: (value: string, fieldName = 'Bu alan'): string | undefined => {
    if (!value || value.trim().length === 0) return `${fieldName} zorunludur`;
    return undefined;
  },

  minLength: (value: string, min: number, fieldName = 'Bu alan'): string | undefined => {
    if (value && value.length < min) return `${fieldName} en az ${min} karakter olmalıdır`;
    return undefined;
  },

  maxLength: (value: string, max: number, fieldName = 'Bu alan'): string | undefined => {
    if (value && value.length > max) return `${fieldName} en çok ${max} karakter olmalıdır`;
    return undefined;
  },

  phone: (value: string): string | undefined => {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!value) return 'Telefon numarası zorunludur';
    if (!phoneRegex.test(value.replace(/\s/g, ''))) return 'Geçerli bir telefon numarası girin';
    return undefined;
  },

  url: (value: string): string | undefined => {
    try {
      new URL(value);
      return undefined;
    } catch {
      return 'Geçerli bir URL girin';
    }
  },

  match: (value1: string, value2: string, fieldName = 'Değerler'): string | undefined => {
    if (value1 !== value2) return `${fieldName} eşleşmiyor`;
    return undefined;
  }
};

/**
 * Validate form using validators
 */
export function validateForm(
  data: Record<string, any>,
  schema: Record<string, (value: any) => string | undefined>
): FormErrors {
  const errors: FormErrors = {};

  Object.entries(schema).forEach(([field, validator]) => {
    const error = validator(data[field]);
    if (error) {
      errors[field] = [error];
    }
  });

  return errors;
}
