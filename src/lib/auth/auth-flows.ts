import bcrypt from 'bcryptjs';

import { getCache, setCache, deleteCache } from '../cache';
import { getRedisClient, prefixKey } from '../cache/cache';
import { createToken, getUserFromToken, hashPassword, validatePasswordStrength } from '../auth';
import { validateEmail } from '../validation';

// Pre-computed bcrypt hash used for constant-time login defense.
// When user not found, we still call bcrypt.compare against this dummy hash
// to equalize timing with valid users (prevents email enumeration via timing oracle).
const DUMMY_BCRYPT_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
import { logger } from '../logging';
import { query, queryOne } from '../postgres';
import { verifyTOTPCode } from '../two-factor';

interface SessionCookieStore {
  get?: (key: string) => { value: string } | undefined;
  set: (
    key: string,
    value: string,
    options?: {
      path?: string;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      maxAge?: number;
    },
  ) => void;
}

interface AuthSessionUser {
  id: string;
  email: string;
  role?: string;
}

interface LoginUserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
  status: string | null;
  avatar_url: string | null;
  points: number | null;
  two_factor_enabled?: boolean | null;
  two_factor_secret?: string | null;
}

export interface LoginFlowResult {
  success: boolean;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    avatar: string | null;
    points: number;
  };
}

export interface RegisterFlowResult {
  success: boolean;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

let authSessionCacheWarned = false;

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

function isRedisConnectionIssue(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  const lowered = text.toLowerCase();
  return (
    lowered.includes('redis') ||
    lowered.includes('socket') ||
    lowered.includes('econnrefused') ||
    lowered.includes('closed') ||
    lowered.includes('connect') ||
    lowered.includes('not open')
  );
}

async function persistAuthSession(token: string, user: AuthSessionUser): Promise<void> {
  try {
    const redis = await getRedisClient();
    const ttl = parseInt(process.env.SESSION_TIMEOUT || '86400', 10);
    await redis.setEx(
      prefixKey(`session:${token}`),
      ttl,
      JSON.stringify({ userId: user.id, email: user.email, role: user.role || 'user' }),
    );
  } catch (error) {
    if (isRedisConnectionIssue(error)) {
      if (!authSessionCacheWarned) {
        logger.warn('Auth session cache write failed, continuing without Redis session (logging once)');
        authSessionCacheWarned = true;
      }
      return;
    }
    logger.warn('Auth session cache write failed, continuing without Redis session', {
      message: toError(error).message,
    });
  }
}

function setAuthCookie(cookies: SessionCookieStore, token: string): void {
  cookies.set('auth-token', token, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'strict',
    maxAge: 86400,
  });
}

// Invalidates any pre-existing session before issuing a new one.
// Prevents stale-session attacks: a previously stolen token would otherwise
// remain valid for up to SESSION_TIMEOUT seconds after re-login.
async function invalidateExistingSession(cookies: SessionCookieStore): Promise<void> {
  try {
    const existingToken = cookies.get?.('auth-token')?.value;
    if (!existingToken) return;
    const redis = await getRedisClient();
    await redis.del(prefixKey(`session:${existingToken}`));
  } catch {
    // Non-fatal — the new session is still created; old one will expire naturally
  }
}

/**
 * OAuth login için standart JWT oturumu oluşturur.
 * callback.ts'in createUserSession (hex token, user_sessions tablosu) yerine kullanılır —
 * o token middleware'in verifyToken (JWT) beklentisiyle uyuşmuyor, OAuth login broken kalıyor.
 */
export async function runOAuthSessionFlow(
  userId: string,
  email: string,
  role: string,
  cookies: SessionCookieStore,
): Promise<void> {
  await invalidateExistingSession(cookies);
  const token = createToken({ userId, email, role });
  await persistAuthSession(token, { id: userId, email, role });
  setAuthCookie(cookies, token);
  await query('UPDATE users SET updated_at = NOW() WHERE id = $1', [userId]);
}

const MAX_FAILED_LOGINS = 5;
const LOGIN_LOCKOUT_SECONDS = 900; // 15 dakika

export async function runLoginFlow(
  input: { email: string; password: string },
  cookies: SessionCookieStore,
): Promise<LoginFlowResult> {
  const email = input.email.toLowerCase().trim();
  const password = input.password;

  const failedKey = `login:failed:${email}`;
  const failedCount = Number(await getCache(failedKey).catch(() => null)) || 0;
  if (failedCount >= MAX_FAILED_LOGINS) {
    throw new Error('Çok fazla başarısız giriş denemesi. 15 dakika sonra tekrar deneyin.');
  }

  const result = await query<LoginUserRow>(
    'SELECT id, full_name, email, password_hash, role, status, avatar_url, points, two_factor_enabled, two_factor_secret FROM users WHERE email = $1',
    [email],
  );

  if (result.rows.length === 0) {
    // Constant-time defense: equalize timing with valid-user path
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
    await setCache(failedKey, failedCount + 1, LOGIN_LOCKOUT_SECONDS).catch(() => null);
    throw new Error('E-posta veya şifre hatalı.');
  }

  const user = result.rows[0];

  if (user.status === 'suspended' || user.status === 'deleted') {
    await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
    await setCache(failedKey, failedCount + 1, LOGIN_LOCKOUT_SECONDS).catch(() => null);
    throw new Error('E-posta veya şifre hatalı.');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    await setCache(failedKey, failedCount + 1, LOGIN_LOCKOUT_SECONDS).catch(() => null);
    throw new Error('E-posta veya şifre hatalı.');
  }

  await deleteCache(failedKey).catch(() => null);

  if (Boolean(user.two_factor_enabled) && Boolean(user.two_factor_secret)) {
    const tempToken = createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      purpose: '2fa_pending',
    } as never);
    await setCache(`2fa:pending:${tempToken}`, '1', 300).catch(() => null);
    return {
      success: true,
      requiresTwoFactor: true,
      tempToken,
    };
  }

  await invalidateExistingSession(cookies);
  await query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);

  const token = createToken({ userId: user.id, email: user.email, role: user.role });
  await persistAuthSession(token, { id: user.id, email: user.email, role: user.role });
  setAuthCookie(cookies, token);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      avatar: user.avatar_url,
      points: user.points || 0,
    },
  };
}

export async function runRegisterFlow(
  input: { fullName: string; email: string; password: string },
  cookies: SessionCookieStore,
): Promise<RegisterFlowResult> {
  const fullName = input.fullName.trim();
  const email = input.email.toLowerCase().trim();
  const password = input.password;

  if (!validateEmail(email)) {
    throw new Error('Geçerli bir e-posta adresi giriniz.');
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    throw new Error(strength.error || 'Şifre gereksinimleri karşılanmadı.');
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new Error('Bu e-posta adresi zaten kayıtlı.');
  }

  const passwordHash = await hashPassword(password);
  const result = await query<{
    id: string;
    full_name: string;
    email: string;
    role: string;
  }>(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'user')
     RETURNING id, full_name, email, role`,
    [fullName, email, passwordHash],
  );

  const user = result.rows[0];
  const token = createToken({ userId: user.id, email: user.email, role: user.role });
  await persistAuthSession(token, { id: user.id, email: user.email, role: user.role });
  setAuthCookie(cookies, token);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
    },
  };
}

const MAX_2FA_ATTEMPTS = 5;

export class TwoFactorRateLimitError extends Error {
  constructor() { super('Çok fazla hatalı 2FA denemesi. Lütfen tekrar giriş yapın.'); }
}

export class TwoFactorCodeError extends Error {
  constructor() { super('Doğrulama kodu hatalı.'); }
}

export async function runLoginTwoFactorFlow(
  input: { tempToken: string; code: string },
  cookies: SessionCookieStore,
): Promise<{ success: boolean }> {
  const { tempToken, code } = input;
  const is2FAPending = await getCache(`2fa:pending:${tempToken}`);

  if (!is2FAPending) {
    throw new Error('Geçici token geçersiz veya süresi dolmuş.');
  }

  // Rate limit: max 5 failed attempts per 2FA session (same TTL as pending key: 5 min).
  // On exceeded limit, invalidate the pending key to force full re-login.
  const attemptKey = `2fa:attempt:${tempToken}`;
  const attempts = Number(await getCache(attemptKey).catch(() => null)) || 0;
  if (attempts >= MAX_2FA_ATTEMPTS) {
    await deleteCache(`2fa:pending:${tempToken}`).catch(() => null);
    throw new TwoFactorRateLimitError();
  }

  // 2FA temp tokens intentionally have no Redis session (persistAuthSession was not called).
  // Use JWT-only decode to avoid the HARD RULE #35 Redis check — the 2fa:pending cache key
  // above already serves as the authoritative "is this a valid pending 2FA token?" check.
  const sessionData = getUserFromToken(tempToken);
  if (!sessionData || sessionData.purpose !== '2fa_pending') {
    throw new Error('Oturum verileri alınamadı.');
  }

  const user = await queryOne<{ two_factor_secret: string | null }>(
    'SELECT two_factor_secret FROM users WHERE id = $1',
    [sessionData.userId],
  );

  if (!user?.two_factor_secret) {
    throw new Error('2FA yapılandırılmadı.');
  }

  const isCodeValid = verifyTOTPCode(user.two_factor_secret, code);
  if (!isCodeValid) {
    await setCache(attemptKey, attempts + 1, 300).catch(() => null);
    throw new TwoFactorCodeError();
  }

  // TOTP replay prevention: reject the same code if already used within its validity window.
  // A network interceptor seeing the code has 90s (3 × 30s TOTP windows) to replay it;
  // this cache key closes that window. Key scoped to userId to avoid cross-user collisions.
  const replayKey = `2fa:used:${sessionData.userId}:${code}`;
  const alreadyUsed = await getCache(replayKey).catch(() => null);
  if (alreadyUsed) {
    throw new TwoFactorCodeError();
  }
  await setCache(replayKey, '1', 90).catch(() => null);

  const authToken = createToken({
    userId: sessionData.userId,
    email: sessionData.email,
    role: sessionData.role,
  });

  await persistAuthSession(authToken, {
    id: sessionData.userId,
    email: sessionData.email,
    role: sessionData.role,
  });
  setAuthCookie(cookies, authToken);
  await deleteCache(`2fa:pending:${tempToken}`);

  return { success: true };
}
