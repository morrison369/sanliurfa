import bcrypt from 'bcryptjs';

import { getCache, setCache, deleteCache } from '../cache';
import { getRedisClient, prefixKey } from '../cache/cache';
import { createToken, hashPassword, validatePasswordStrength, verifyToken } from '../auth';
import { logger } from '../logging';
import { query, queryOne } from '../postgres';
import { verifyTOTPCode } from '../two-factor';

interface SessionCookieStore {
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
    await setCache(failedKey, failedCount + 1, LOGIN_LOCKOUT_SECONDS).catch(() => null);
    throw new Error('E-posta veya şifre hatalı.');
  }

  const user = result.rows[0];

  if (user.status === 'suspended' || user.status === 'deleted') {
    throw new Error('Hesap aktif değil.');
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

export async function runLoginTwoFactorFlow(
  input: { tempToken: string; code: string },
  cookies: SessionCookieStore,
): Promise<{ success: boolean }> {
  const { tempToken, code } = input;
  const is2FAPending = await getCache(`2fa:pending:${tempToken}`);

  if (!is2FAPending) {
    throw new Error('Geçici token geçersiz veya süresi dolmuş.');
  }

  const sessionData = await verifyToken(tempToken);
  if (!sessionData) {
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
    throw new Error('Doğrulama kodu hatalı.');
  }

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
