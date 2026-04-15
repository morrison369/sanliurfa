/**
 * Authentication Module
 * bcrypt password hashing, JWT tokens, Redis session management
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { queryOne } from './postgres';
import { getRedisClient, isRedisAvailable, prefixKey } from './cache/cache';
import { logger } from './logging';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-minimum-32-characters-long';
const SESSION_TTL = parseInt(process.env.SESSION_TIMEOUT || '86400', 10); // 24h default
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// ─── Password Hashing ────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export const hashPasswordAsync = hashPassword; // alias

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const verifyPassword = comparePassword; // alias

/**
 * Validate password complexity
 * Min 8 chars, 1 uppercase, 1 lowercase, 1 number
 */
export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Şifre en az 8 karakter olmalıdır.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir büyük harf içermelidir.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir küçük harf içermelidir.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Şifre en az bir rakam içermelidir.' };
  }
  return { valid: true };
}

// ─── JWT Token ───────────────────────────────────────────────

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

export function createToken(payload: { userId: string; email: string; role?: string }): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
  }));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export const generateJWT = (userId: string, email: string) => createToken({ userId, email });

function decodeToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ─── Session Management (Redis) ──────────────────────────────

async function setSession(token: string, data: any): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    const redis = await getRedisClient();
    const key = prefixKey(`session:${token}`);
    await redis.setEx(key, SESSION_TTL, JSON.stringify(data));
  } catch (err) {
    logger.error('[auth] Failed to set session:', err);
  }
}

async function getSession(token: string): Promise<any | null> {
  if (!isRedisAvailable()) return null;
  try {
    const redis = await getRedisClient();
    const key = prefixKey(`session:${token}`);
    const data = await redis.get(key);
    if (!data) return null;

    // Sliding window: refresh TTL on access
    await redis.expire(key, SESSION_TTL);
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function deleteSession(token: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    const redis = await getRedisClient();
    await redis.del(prefixKey(`session:${token}`));
  } catch (err) {
    logger.error('[auth] Failed to delete session:', err);
  }
}

// ─── Public API ──────────────────────────────────────────────

export async function verifyToken(token: string): Promise<{ userId: string; email: string; role?: string } | null> {
  // First check JWT signature
  const payload = decodeToken(token);
  if (!payload) return null;

  // Then verify session exists in Redis (if available)
  if (isRedisAvailable()) {
    const session = await getSession(token);
    if (!session) return null;
  }

  return { userId: payload.userId, email: payload.email, role: payload.role };
}

export function getUserFromToken(token: string): any | null {
  return decodeToken(token);
}

export async function signIn(
  email: string,
  password: string,
  ip?: string
): Promise<{ success: boolean; error?: string; user?: any; token?: string }> {
  // Brute force check
  if (ip && isRedisAvailable()) {
    try {
      const redis = await getRedisClient();
      const failKey = prefixKey(`login_fail:${ip}`);
      const attempts = await redis.get(failKey);
      if (attempts && parseInt(attempts) >= 5) {
        return { success: false, error: 'Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.' };
      }
    } catch { /* continue */ }
  }

  // User lookup
  const user = await queryOne<any>(
    'SELECT id, email, password_hash, full_name, role, avatar_url, points FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  if (!user) {
    await incrementFailedAttempts(ip);
    return { success: false, error: 'E-posta veya şifre hatalı.' };
  }

  // Password verify
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    await incrementFailedAttempts(ip);
    return { success: false, error: 'E-posta veya şifre hatalı.' };
  }

  // Create token and session
  const token = createToken({ userId: user.id, email: user.email, role: user.role });
  await setSession(token, { userId: user.id, email: user.email, role: user.role });

  // Clear failed attempts
  if (ip && isRedisAvailable()) {
    try {
      const redis = await getRedisClient();
      await redis.del(prefixKey(`login_fail:${ip}`));
    } catch { /* ignore */ }
  }

  return {
    success: true,
    user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, avatar: user.avatar_url },
    token,
  };
}

export async function signUp(
  email: string,
  password: string,
  data?: { fullName?: string }
): Promise<{ success: boolean; error?: string; user?: any; token?: string }> {
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return { success: false, error: strength.error };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check existing
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing) {
    return { success: false, error: 'Bu e-posta adresi zaten kayıtlı.' };
  }

  // Hash and insert
  const passwordHash = await hashPassword(password);
  const newUser = await queryOne<any>(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, 'user') RETURNING id, email, full_name, role`,
    [normalizedEmail, passwordHash, data?.fullName || '']
  );

  if (!newUser) {
    return { success: false, error: 'Kullanıcı oluşturulamadı.' };
  }

  // Create session
  const token = createToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
  await setSession(token, { userId: newUser.id, email: newUser.email, role: newUser.role });

  return {
    success: true,
    user: { id: newUser.id, email: newUser.email, fullName: newUser.full_name, role: newUser.role },
    token,
  };
}

export async function signOut(token?: string): Promise<void> {
  if (token) {
    await deleteSession(token);
  }
}

export async function getCurrentUser(token?: string): Promise<any | null> {
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  return queryOne(
    'SELECT id, email, full_name, role, avatar_url, points FROM users WHERE id = $1',
    [payload.userId]
  );
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const user = await queryOne<any>('SELECT id, email, role FROM users WHERE id = $1', [userId]);
  const token = createToken({ userId, email: user?.email || '', role: user?.role });
  await setSession(token, { userId, email: user?.email, role: user?.role });

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + SESSION_TTL);
  return { token, expiresAt };
}

export async function requireAuth(request: Request): Promise<{ user: any | null; redirect?: string }> {
  const authHeader = request.headers.get('Authorization');
  let token = '';

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/auth-token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return { user: null, redirect: '/giris' };

  const user = await getCurrentUser(token);
  if (!user) return { user: null, redirect: '/giris' };

  return { user };
}

export async function requireRole(request: Request, role: string): Promise<{ user: any | null; redirect?: string }> {
  const result = await requireAuth(request);
  if (!result.user) return result;

  if (role === 'admin' && result.user.role !== 'admin' && result.user.role !== 'moderator') {
    return { user: null, redirect: '/' };
  }

  return result;
}

export async function verifyAdmin(user: any): Promise<boolean> {
  return user?.role === 'admin' || user?.role === 'moderator';
}

export async function getUserFromRequest(request: Request): Promise<any | null> {
  const result = await requireAuth(request);
  return result.user;
}

// ─── Helpers ─────────────────────────────────────────────────

async function incrementFailedAttempts(ip?: string): Promise<void> {
  if (!ip || !isRedisAvailable()) return;
  try {
    const redis = await getRedisClient();
    const key = prefixKey(`login_fail:${ip}`);
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, 900); // 15 min window
    }
  } catch { /* ignore */ }
}
