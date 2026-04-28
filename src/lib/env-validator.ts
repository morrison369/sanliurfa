/**
 * Environment Validator
 * Stub for environment variable validation
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEnv(): EnvValidationResult {
  const errors: string[] = [];
  
  // Check required env vars
  const required = ['DATABASE_URL', 'SUPABASE_URL', 'JWT_SECRET'];
  required.forEach(key => {
    if (!process.env[key]) {
      errors.push(`Missing required env var: ${key}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue;
}

export default validateEnv;
