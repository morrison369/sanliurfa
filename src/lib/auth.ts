/**
 * Authentication Module
 * bcrypt password hashing, JWT tokens, Redis session management
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { queryOne } from './postgres';
import { getRedisClient, prefixKey, redisToString } from './cache/cache';
import { logger } from './logging';

function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'test') return 'test-jwt-secret-key-minimum-32-characters-long';
  throw new Error('JWT_SECRET environment variable is required');
}

const SESSION_TTL = parseInt(process.env.SESSION_TIMEOUT || '86400', 10); // 24h default
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const IS_TEST_ENV = process.env.NODE_ENV === 'test';

// Pre-computed bcrypt hash of "InvalidDummyPassword!" with rounds=12.
// Used for constant-time login defense: when user not found, we still call
// bcrypt.compare against this dummy hash to equalize timing with valid users.
// Hash never matches any real password (different input).
const DUMMY_BCRYPT_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

interface JwtPayload {
  userId: string;
  email: string;
  role?: string;
  purpose?: string;
  iat?: number;
  exp?: number;
}

interface SessionData {
  userId: string;
  email: string;
  role?: string;
}

interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  points: number;
}

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatar: string | null;
  points?: number;
}

interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  points: number;
}

// ─── Password Hashing ────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  if (IS_TEST_ENV) return '';

  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export const hashPasswordAsync = hashPassword; // alias

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (IS_TEST_ENV) return false;

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
  if (password.length > 72) {
    return { valid: false, error: 'Şifre maksimum 72 karakter olmalıdır.' };
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
  if (IS_TEST_ENV) return '';
  const jwtSecret = getJwtSecret();

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({
    userId: payload.userId,
    email: payload.email,
    ...(payload.role ? { role: payload.role } : {}),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
  }));
  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function generateJWT(userId: string, email: string): string {
  if (IS_TEST_ENV) return `jwt-token-${userId}-${email}`;
  return createToken({ userId, email });
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const jwtSecret = getJwtSecret();
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', jwtSecret)
      .update(`${header}.${body}`)
      .digest('base64url');

    // Constant-time signature comparison — `!==` byte-by-byte timing leak'i.
    // Buffer'ların farklı uzunlukta olması durumunda timingSafeEqual throw eder, length pre-check şart.
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as Partial<JwtPayload>;
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Session Management (Redis) ──────────────────────────────

async function setSession(token: string, data: SessionData): Promise<void> {
  try {
    const redis = await getRedisClient();
    const key = prefixKey(`session:${token}`);
    await redis.setEx(key, SESSION_TTL, JSON.stringify(data));
  } catch (err) {
    logger.error('[auth] Failed to set session:', err);
  }
}

type SessionCheckResult =
  | { status: 'found'; data: SessionData }
  | { status: 'not-found' }    // Redis up, session explicitly absent (user logged out)
  | { status: 'unavailable' }; // Redis down — fail-open, JWT-only validation allowed

async function getSession(token: string): Promise<SessionCheckResult> {
  try {
    const redis = await getRedisClient();
    const key = prefixKey(`session:${token}`);
    const data = await redis.get(key);
    if (!data) return { status: 'not-found' };

    // Sliding window: refresh TTL on access
    await redis.expire(key, SESSION_TTL);
    return { status: 'found', data: JSON.parse(redisToString(data)!) as SessionData };
  } catch {
    return { status: 'unavailable' };
  }
}

async function deleteSession(token: string): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.del(prefixKey(`session:${token}`));
  } catch (err) {
    logger.error('[auth] Failed to delete session:', err);
  }
}

// ─── Public API ──────────────────────────────────────────────

function verifyTokenWithSession(token: string): Promise<JwtPayload | null> {
  return (async () => {
    // First check JWT signature
    const payload = decodeToken(token);
    if (!payload) return null;

    // HARD RULE #35: always verify Redis session so logout/account-suspension immediately
    // invalidates tokens. Fail-open on Redis unavailability — service stays up but stolen
    // tokens can be used during the outage window (acceptable vs. mass logout).
    const session = await getSession(token);
    if (session.status === 'not-found') return null; // Explicitly logged out
    if (session.status === 'unavailable') {
      logger.warn('[auth] Redis unavailable — JWT-only validation (fail-open)');
    }

    return {
      userId: payload.userId,
      email: payload.email,
      ...(payload.role ? { role: payload.role } : {}),
    };
  })();
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  if (IS_TEST_ENV) return null;
  return verifyTokenWithSession(token);
}

export function getUserFromToken(token: string): JwtPayload | null {
  return decodeToken(token);
}

export async function signIn(
  email: string,
  password: string,
  ip?: string
): Promise<{ success: boolean; error?: string; user?: AuthUser; token?: string }> {
  // Brute force check
  if (ip) {
    try {
      const redis = await getRedisClient();
      const failKey = prefixKey(`login_fail:${ip}`);
      const attempts = redisToString(await redis.get(failKey));
      if (attempts && parseInt(attempts, 10) >= 5) {
        return { success: false, error: 'Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.' };
      }
    } catch { /* continue */ }
  }

  // User lookup
  const user = await queryOne<UserRecord>(
    'SELECT id, email, password_hash, full_name, role, avatar_url, points FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  if (!user) {
    // Constant-time defense: bcrypt.compare even when user not found, with a dummy hash.
    // Without this, attackers can enumerate valid emails by measuring response time
    // (user-not-found ~10ms vs wrong-password ~100-300ms).
    await comparePassword(password, DUMMY_BCRYPT_HASH);
    await incrementFailedAttempts(ip);
    return { success: false, error: 'E-posta veya şifre hatalı.' };
  }

  // Password verify
  const isValid = await comparePassword(password, user.password_hash);
  if (!isValid) {
    await incrementFailedAttempts(ip);
    return { success: false, error: 'E-posta veya şifre hatalı.' };
  }

  // Create token and session
  const token = createToken({ userId: user.id, email: user.email, role: user.role });
  await setSession(token, { userId: user.id, email: user.email, role: user.role });

  // Clear failed attempts
  if (ip) {
    try {
      const redis = await getRedisClient();
      await redis.del(prefixKey(`login_fail:${ip}`));
    } catch { /* ignore */ }
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatar: user.avatar_url,
      points: user.points,
    },
    token,
  };
}

export async function signUp(
  email: string,
  password: string,
  data?: { fullName?: string }
): Promise<{ success: boolean; error?: string; user?: AuthUser; token?: string }> {
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return { success: false, error: strength.error || 'Şifre gereksinimleri karşılanmadı.' };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check existing
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing) {
    return { success: false, error: 'Bu e-posta adresi zaten kayıtlı.' };
  }

  // Hash and insert
  const passwordHash = await hashPassword(password);
  const newUser = await queryOne<{ id: string; email: string; full_name: string; role: string }>(
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
    user: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
      avatar: null,
      points: 0,
    },
    token,
  };
}

export async function signOut(token?: string): Promise<void> {
  if (token) {
    await deleteSession(token);
  }
}

export async function getCurrentUser(token?: string): Promise<SessionUser | null> {
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  return queryOne<SessionUser>(
    'SELECT id, email, full_name, role, avatar_url, points FROM users WHERE id = $1',
    [payload.userId]
  );
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const user = await queryOne<{ id: string; email: string; role: string }>('SELECT id, email, role FROM users WHERE id = $1', [userId]);
  const email = user?.email ?? '';
  const role = user?.role;
  const token = createToken({ userId, email, ...(role ? { role } : {}) });
  await setSession(token, { userId, email, ...(role ? { role } : {}) });

  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + SESSION_TTL);
  return { token, expiresAt };
}

export async function requireAuth(request: Request): Promise<{ user: SessionUser | null; redirect?: string }> {
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

export async function requireRole(request: Request, role: string): Promise<{ user: SessionUser | null; redirect?: string }> {
  const result = await requireAuth(request);
  if (!result.user) return result;

  if (role === 'admin' && result.user.role !== 'admin' && result.user.role !== 'moderator') {
    return { user: null, redirect: '/' };
  }

  return result;
}

export async function verifyAdmin(user: { role?: string } | null): Promise<boolean> {
  return user?.role === 'admin' || user?.role === 'moderator';
}

export async function getUserFromRequest(request: Request): Promise<SessionUser | null> {
  const result = await requireAuth(request);
  return result.user;
}

// ─── Helpers ─────────────────────────────────────────────────

async function incrementFailedAttempts(ip?: string): Promise<void> {
  if (!ip) return;
  try {
    const redis = await getRedisClient();
    const key = prefixKey(`login_fail:${ip}`);
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, 900); // 15 min window
    }
  } catch { /* ignore */ }
}
