/**
 * CSRF Protection
 * Token generation and validation
 */

import { randomBytes, createHash } from 'crypto';
import { getCache, setCache, deleteCache } from '../cache';

const TOKEN_LENGTH = 32;
const TOKEN_TTL = 3600; // 1 hour

/**
 * Generate CSRF token
 */
export async function generateCSRFToken(sessionId: string): Promise<string> {
  const token = randomBytes(TOKEN_LENGTH).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  
  // Store token hash in cache
  await setCache(
    `csrf:${sessionId}`,
    { hash: tokenHash, createdAt: Date.now() },
    TOKEN_TTL
  );
  
  return token;
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(
  sessionId: string,
  token: string
): Promise<boolean> {
  if (!token || !sessionId) return false;
  
  const stored = await getCache<{ hash: string; createdAt: number }>(`csrf:${sessionId}`);
  if (!stored) return false;
  
  const tokenHash = createHash('sha256').update(token).digest('hex');
  
  // Constant-time comparison to prevent timing attacks
  let match = true;
  for (let i = 0; i < tokenHash.length; i++) {
    if (tokenHash[i] !== stored.hash[i]) {
      match = false;
    }
  }
  
  return match;
}

/**
 * Rotate CSRF token (after successful validation)
 */
export async function rotateCSRFToken(sessionId: string): Promise<string> {
  await deleteCache(`csrf:${sessionId}`);
  return generateCSRFToken(sessionId);
}

/**
 * Get CSRF token from request
 */
export function getCSRFTokenFromRequest(request: Request): string | null {
  // Check header first
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) return headerToken;
  
  // Check form data
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/csrf_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  
  return null;
}

/**
 * CSRF protection middleware
 */
export async function csrfProtection(
  request: Request,
  sessionId: string
): Promise<{ valid: boolean; newToken?: string }> {
  // Skip for GET, HEAD, OPTIONS requests
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }
  
  const token = getCSRFTokenFromRequest(request);
  if (!token) {
    return { valid: false };
  }
  
  const valid = await validateCSRFToken(sessionId, token);
  if (!valid) {
    return { valid: false };
  }
  
  // Rotate token after successful validation
  const newToken = await rotateCSRFToken(sessionId);
  return { valid: true, newToken };
}

/**
 * Create CSRF meta tag for forms
 */
export async function createCSRFTag(sessionId: string): Promise<string> {
  const token = await generateCSRFToken(sessionId);
  return `<meta name="csrf-token" content="${token}">`;
}

/**
 * Create CSRF cookie
 */
export function createCSRFCookie(token: string): string {
  return `csrf_token=${encodeURIComponent(token)}; Path=/; SameSite=Strict; Secure; Max-Age=${TOKEN_TTL}`;
}
