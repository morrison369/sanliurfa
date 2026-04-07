/**
 * Security Guidelines & Best Practices
 * Provides security recommendations and best practices
 */

export interface SecurityGuideline {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  implemented: boolean;
  resources?: string[];
}

export const SECURITY_GUIDELINES: SecurityGuideline[] = [
  // Authentication & Session Management
  {
    id: 'auth-01',
    category: 'Authentication',
    title: 'Enforce Strong Passwords',
    description: 'Require minimum 8 characters, uppercase, numbers, and special characters',
    impact: 'high',
    implemented: true,
    resources: ['https://owasp.org/www-community/attacks/authentication_cheat_sheet']
  },
  {
    id: 'auth-02',
    category: 'Authentication',
    title: 'Use HTTPS Only',
    description: 'All authentication should use HTTPS to prevent credential interception',
    impact: 'critical',
    implemented: true,
    resources: ['https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html']
  },
  {
    id: 'auth-03',
    category: 'Authentication',
    title: 'Implement Bcrypt Password Hashing',
    description: 'Use bcrypt with 12+ rounds for password hashing, never use MD5/SHA1',
    impact: 'critical',
    implemented: true,
    resources: ['https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html']
  },
  {
    id: 'auth-04',
    category: 'Authentication',
    title: 'Session Management with Expiration',
    description: 'Sessions should expire after 24 hours of inactivity',
    impact: 'high',
    implemented: true,
    resources: ['https://owasp.org/www-community/attacks/Session_fixation']
  },

  // API Security
  {
    id: 'api-01',
    category: 'API Security',
    title: 'Implement Rate Limiting',
    description: 'Prevent brute force attacks with 100 req/15min per IP limit',
    impact: 'high',
    implemented: true,
    resources: ['https://owasp.org/www-community/attacks/Brute_force_attack']
  },
  {
    id: 'api-02',
    category: 'API Security',
    title: 'Use CORS Properly',
    description: 'Restrict CORS to known origins, never use wildcard',
    impact: 'high',
    implemented: true,
    resources: ['https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html']
  },
  {
    id: 'api-03',
    category: 'API Security',
    title: 'Input Validation & Sanitization',
    description: 'Validate all user input, sanitize to prevent XSS',
    impact: 'critical',
    implemented: true,
    resources: ['https://owasp.org/www-community/attacks/xss/']
  },
  {
    id: 'api-04',
    category: 'API Security',
    title: 'Parameterized Queries',
    description: 'Use parameterized statements to prevent SQL injection',
    impact: 'critical',
    implemented: true,
    resources: ['https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html']
  },

  // Data Protection
  {
    id: 'data-01',
    category: 'Data Protection',
    title: 'Encrypt Sensitive Data at Rest',
    description: 'Encrypt passwords, API keys, tokens at rest',
    impact: 'critical',
    implemented: false,
    resources: ['https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html']
  },
  {
    id: 'data-02',
    category: 'Data Protection',
    title: 'Database Connection SSL/TLS',
    description: 'Require SSL/TLS for all database connections',
    impact: 'high',
    implemented: true,
    resources: ['https://www.postgresql.org/docs/current/ssl-postgres.html']
  },
  {
    id: 'data-03',
    category: 'Data Protection',
    title: 'Access Control & RBAC',
    description: 'Implement role-based access control with minimal privileges',
    impact: 'high',
    implemented: true,
    resources: ['https://en.wikipedia.org/wiki/Role-based_access_control']
  },
  {
    id: 'data-04',
    category: 'Data Protection',
    title: 'Audit Logging',
    description: 'Log all sensitive operations with user, timestamp, action',
    impact: 'high',
    implemented: true,
    resources: ['https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html']
  },

  // Infrastructure
  {
    id: 'infra-01',
    category: 'Infrastructure',
    title: 'Security Headers',
    description: 'Implement CSP, X-Frame-Options, X-XSS-Protection headers',
    impact: 'high',
    implemented: true,
    resources: ['https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html']
  },
  {
    id: 'infra-02',
    category: 'Infrastructure',
    title: 'Keep Dependencies Updated',
    description: 'Regularly update npm packages, run "npm audit" weekly',
    impact: 'medium',
    implemented: false,
    resources: ['https://docs.npmjs.com/cli/v8/commands/npm-audit']
  },
  {
    id: 'infra-03',
    category: 'Infrastructure',
    title: 'Environment Variables',
    description: 'Never commit secrets, use .env files with secrets management',
    impact: 'critical',
    implemented: true,
    resources: ['https://12factor.net/config']
  },

  // Monitoring & Response
  {
    id: 'monitor-01',
    category: 'Monitoring',
    title: 'Error Rate Monitoring',
    description: 'Alert when error rate exceeds 10% in production',
    impact: 'medium',
    implemented: true,
    resources: ['https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html']
  },
  {
    id: 'monitor-02',
    category: 'Monitoring',
    title: 'Slow Query Detection',
    description: 'Alert on queries > 1000ms, debug log on > 100ms',
    impact: 'medium',
    implemented: true,
    resources: ['https://www.postgresql.org/docs/current/runtime-config-logging.html']
  },
  {
    id: 'monitor-03',
    category: 'Monitoring',
    title: 'Failed Login Tracking',
    description: 'Track failed login attempts, lock account after 5 attempts',
    impact: 'high',
    implemented: false,
    resources: ['https://owasp.org/www-community/attacks/authentication_cheat_sheet']
  }
];

/**
 * Get all security guidelines
 */
export function getAllGuidelines(): SecurityGuideline[] {
  return SECURITY_GUIDELINES;
}

/**
 * Get guidelines by category
 */
export function getGuidelinesByCategory(category: string): SecurityGuideline[] {
  return SECURITY_GUIDELINES.filter(g => g.category === category);
}

/**
 * Get unimplemented guidelines (high priority items)
 */
export function getUnimplementedGuidelines(): SecurityGuideline[] {
  return SECURITY_GUIDELINES.filter(g => !g.implemented).sort((a, b) => {
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
}

/**
 * Get security score based on implemented guidelines
 */
export function calculateSecurityScore(): { score: number; implemented: number; total: number } {
  const implemented = SECURITY_GUIDELINES.filter(g => g.implemented).length;
  const total = SECURITY_GUIDELINES.length;
  const score = Math.round((implemented / total) * 100);

  return { score, implemented, total };
}

/**
 * Get critical unimplemented items
 */
export function getCriticalItems(): SecurityGuideline[] {
  return SECURITY_GUIDELINES.filter(
    g => !g.implemented && g.impact === 'critical'
  );
}
