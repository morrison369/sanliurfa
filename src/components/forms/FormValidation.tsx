/**
 * Form Validation & Error Handling Components
 * Comprehensive form validation with Turkish error messages
 */

import { useState, useCallback, type ReactNode } from 'react';

// Validation rules
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  url?: boolean;
  match?: string; // field name to match
  custom?: (value: any) => boolean;
}

export interface ValidationErrors {
  [key: string]: string;
}

// Turkish error messages
const errorMessages: Record<string, (params?: any) => string> = {
  required: () => 'Bu alan zorunludur',
  minLength: (min) => `En az ${min} karakter olmalıdır`,
  maxLength: (max) => `En fazla ${max} karakter olmalıdır`,
  min: (min) => `En az ${min} olmalıdır`,
  max: (max) => `En fazla ${max} olmalıdır`,
  pattern: () => 'Geçersiz format',
  email: () => 'Geçerli bir e-posta adresi giriniz',
  phone: () => 'Geçerli bir telefon numarası giriniz',
  url: () => 'Geçerli bir URL giriniz',
  match: (field) => `${field} alanı ile eşleşmiyor`,
  custom: () => 'Geçersiz değer',
};

/**
 * Validate single field
 */
export function validateField(
  value: any,
  rules: ValidationRule,
  allValues?: Record<string, any>
): string | null {
  if (rules.required && (!value || value === '')) {
    return errorMessages.required();
  }

  if (!value && !rules.required) return null;

  if (rules.minLength && String(value).length < rules.minLength) {
    return errorMessages.minLength(rules.minLength);
  }

  if (rules.maxLength && String(value).length > rules.maxLength) {
    return errorMessages.maxLength(rules.maxLength);
  }

  if (rules.min !== undefined && Number(value) < rules.min) {
    return errorMessages.min(rules.min);
  }

  if (rules.max !== undefined && Number(value) > rules.max) {
    return errorMessages.max(rules.max);
  }

  if (rules.email && !isValidEmail(value)) {
    return errorMessages.email();
  }

  if (rules.phone && !isValidPhone(value)) {
    return errorMessages.phone();
  }

  if (rules.url && !isValidURL(value)) {
    return errorMessages.url();
  }

  if (rules.pattern && !rules.pattern.test(String(value))) {
    return errorMessages.pattern();
  }

  if (rules.match && allValues && value !== allValues[rules.match]) {
    return errorMessages.match(rules.match);
  }

  if (rules.custom && !rules.custom(value)) {
    return errorMessages.custom();
  }

  return null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(phone);
}

function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * useForm hook for form validation
 */
export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, ValidationRule>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(validationRules)) {
      const error = validateField(values[field], rules as ValidationRule, values);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules]);

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as string]) {
      const error = validateField(value, validationRules[field] as ValidationRule, values);
      setErrors(prev => ({
        ...prev,
        [field]: error || ''
      }));
    }
  }, [errors, validationRules, values]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(values[field], validationRules[field] as ValidationRule, values);
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  }, [values, validationRules]);

  const handleSubmit = useCallback(async (onSubmit: (values: T) => Promise<void>) => {
    setIsSubmitting(true);
    
    if (validate()) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
  }, [validate, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    reset,
    setValues,
  };
}

/**
 * Form Error Component
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

/**
 * Form Input with validation
 */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
  helpText?: string;
}

export function FormInput({
  label,
  error,
  touched,
  helpText,
  className = '',
  ...props
}: FormInputProps) {
  const hasError = touched && error;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors
          ${hasError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          ${className}`}
        {...props}
      />
      {helpText && !hasError && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
      <FormError message={error} />
    </div>
  );
}

/**
 * Form Select with validation
 */
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  touched?: boolean;
  options: Array<{ value: string; label: string }>;
}

export function FormSelect({
  label,
  error,
  touched,
  options,
  className = '',
  ...props
}: FormSelectProps) {
  const hasError = touched && error;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors bg-white
          ${hasError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FormError message={error} />
    </div>
  );
}

/**
 * Form Textarea with validation
 */
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  touched?: boolean;
}

export function FormTextarea({
  label,
  error,
  touched,
  className = '',
  ...props
}: FormTextareaProps) {
  const hasError = touched && error;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {props.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none
          ${hasError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          ${className}`}
        {...props}
      />
      <FormError message={error} />
    </div>
  );
}

/**
 * Form Submit Button
 */
interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: ReactNode;
}

export function SubmitButton({ isLoading, children, className = '', ...props }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className={`w-full px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2
        ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}
