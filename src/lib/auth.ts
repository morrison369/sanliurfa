// Auth utilities - PostgreSQL based with bcrypt + Redis sessions
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { queryOne } from './postgres';
import { setCache, getCache, deleteCache, isRedisAvailable } from './cache';
import { logger } from './logging';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ==================== PASSWORD HASHING ====================

/**
 * Hash a plaintext password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(12);
  return bcryptjs.hash(password, salt);
}

/**
 * Verify plaintext password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Check if a hash is the old SHA-256 format (migration helper)
 */
function isLegacySha256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/.test(hash);
}

/**
 * Verify legacy SHA-256 hash (for migration from old system)
 */
function verifyLegacyHash(password: string, hash: string): boolean {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex') === hash;
}

// ==================== SESSION MANAGEMENT (Redis-backed) ====================

interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
}

const SESSION_TTL = 86400; // 24 hours in seconds
const globalSessionStore = globalThis as typeof globalThis & {
  __sanliurfaInMemorySessions?: Map<string, { data: SessionData; expiresAt: number }>;
};
const inMemorySessions =
  globalSessionStore.__sanliurfaInMemorySessions ??
  (globalSessionStore.__sanliurfaInMemorySessions = new Map<string, { data: SessionData; expiresAt: number }>());
const IN_MEMORY_SESSION_CLEANUP_THRESHOLD = 2000;
const STATELESS_TOKEN_PREFIX = 'st';

interface StatelessTokenPayload {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
  exp: number;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function createStatelessSessionToken(sessionData: SessionData): string {
  const payload: StatelessTokenPayload = {
    ...sessionData,
    exp: sessionData.createdAt + SESSION_TTL * 1000
  };
  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${STATELESS_TOKEN_PREFIX}.${payloadB64}.${signature}`;
}

function verifyStatelessSessionToken(token: string): SessionData | null {
  if (!token.startsWith(`${STATELESS_TOKEN_PREFIX}.`)) {
    return null;
  }

  const [, payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(payloadB64)
    .digest('base64url');

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  const signatureValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  if (!signatureValid) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(payloadB64)) as Partial<StatelessTokenPayload>;
    if (
      !parsed ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.email !== 'string' ||
      typeof parsed.role !== 'string' ||
      typeof parsed.createdAt !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }

    if (parsed.exp <= Date.now()) {
      return null;
    }

    return {
      userId: parsed.userId,
      email: parsed.email,
      role: parsed.role,
      createdAt: parsed.createdAt
    };
  } catch {
    return null;
  }
}

function cleanupInMemorySessions(nowMs: number): void {
  if (inMemorySessions.size < IN_MEMORY_SESSION_CLEANUP_THRESHOLD) {
    return;
  }

  for (const [token, session] of inMemorySessions.entries()) {
    if (session.expiresAt <= nowMs) {
      inMemorySessions.delete(token);
    }
  }
}

function setInMemorySession(token: string, data: SessionData): void {
  const nowMs = Date.now();
  cleanupInMemorySessions(nowMs);
  inMemorySessions.set(token, { data, expiresAt: nowMs + SESSION_TTL * 1000 });
}

function getInMemorySession(token: string): SessionData | null {
  const existing = inMemorySessions.get(token);
  if (!existing) {
    return null;
  }

  if (existing.expiresAt <= Date.now()) {
    inMemorySessions.delete(token);
    return null;
  }

  return existing.data;
}

/**
 * Create a new session token
 */
export async function createToken(
  userId: string,
  email: string,
  role: string = 'user'
): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionData: SessionData = {
    userId,
    email,
    role,
    createdAt: Date.now()
  };

  // Try to store in Redis first.
  // If Redis is unavailable, fall back to stateless signed token.
  try {
    await setCache(`session:${token}`, sessionData, SESSION_TTL);
    const persisted = await getCache<SessionData>(`session:${token}`);
    if (persisted?.userId === userId) {
      return token;
    }
  } catch (error) {
    logger.warn(
      'Failed to create session in Redis; falling back to stateless token',
      error instanceof Error ? error : new Error(String(error))
    );
  }

  return createStatelessSessionToken(sessionData);
}

/**
 * Verify a session token and return session data
 * Also performs sliding window: refreshes TTL if token is valid
 */
export async function verifyToken(token: string): Promise<SessionData | null> {
  const statelessSession = verifyStatelessSessionToken(token);
  if (statelessSession) {
    return statelessSession;
  }

  try {
    const sessionData = await getCache<SessionData>(`session:${token}`);

    if (!sessionData) {
      const fallbackSession = getInMemorySession(token);
      if (!fallbackSession) {
        return null;
      }

      // Sliding window for in-memory fallback session.
      setInMemorySession(token, fallbackSession);
      return fallbackSession;
    }

    // Sliding window: refresh TTL on each verification
    await setCache(`session:${token}`, sessionData, SESSION_TTL);
    setInMemorySession(token, sessionData);

    return sessionData;
  } catch (error) {
    logger.error('Token verification error', error instanceof Error ? error : new Error(String(error)));
    const fallbackSession = getInMemorySession(token);
    if (fallbackSession) {
      setInMemorySession(token, fallbackSession);
      return fallbackSession;
    }
    return null;
  }
}

/**
 * Get the current user from a token
 */
export async function getCurrentUser(token: string): Promise<any> {
  const sessionData = await verifyToken(token);

  if (!sessionData) {
    return null;
  }

  try {
    // Fetch fresh user data from database
    const user = await queryOne(
      'SELECT id, email, full_name, role, points, level, avatar_url FROM users WHERE id = $1',
      [sessionData.userId]
    );

    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Sign out by deleting the session token
 */
export async function signOut(token: string): Promise<void> {
  if (token.startsWith(`${STATELESS_TOKEN_PREFIX}.`)) {
    return;
  }

  try {
    await deleteCache(`session:${token}`);
  } catch (error) {
    logger.warn('Sign out cache cleanup failed', error instanceof Error ? error : new Error(String(error)));
  } finally {
    inMemorySessions.delete(token);
  }
}

// ==================== AUTHENTICATION FLOW ====================

/**
 * Sign in with email and password
 * Supports both bcrypt and legacy SHA-256 hashes (migration path)
 */
export async function signIn(email: string, password: string) {
  try {
    const user = await queryOne('SELECT id, email, full_name, role, password_hash FROM users WHERE email = $1', [
      email
    ]);

    if (!user) {
      return { data: null, error: { message: 'Invalid credentials' } };
    }

    // Try bcrypt first (modern)
    let passwordValid = await verifyPassword(password, user.password_hash);

    // Fallback to legacy SHA-256 (for migration)
    if (!passwordValid && isLegacySha256Hash(user.password_hash)) {
      passwordValid = verifyLegacyHash(password, user.password_hash);

      // If legacy hash is valid, upgrade it to bcrypt
      if (passwordValid) {
        try {
          const newHash = await hashPassword(password);
          await queryOne('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, user.id]);
          logger.info('Password hash upgraded to bcrypt', { email });
        } catch (upgradeError) {
          logger.error(
            'Failed to upgrade password hash',
            upgradeError instanceof Error ? upgradeError : new Error(String(upgradeError))
          );
          // Continue anyway - old hash still works
        }
      }
    }

    if (!passwordValid) {
      return { data: null, error: { message: 'Invalid credentials' } };
    }

    const token = await createToken(user.id, user.email, user.role);
    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    };

    return { data: { user: safeUser, token }, error: null };
  } catch (error: any) {
    logger.error('Sign in error', error instanceof Error ? error : new Error(String(error)), { email });
    return { data: null, error: { message: 'Authentication failed' } };
  }
}

/**
 * Sign up with email, password, and full name
 */
export async function signUp(email: string, password: string, fullName: string) {
  try {
    // Check if email already exists
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return { data: null, error: { message: 'Email already registered' } };
    }

    // Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await queryOne(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
      [email, passwordHash, fullName, 'user']
    );

    return { data: { user: result }, error: null };
  } catch (error: any) {
    logger.error('Sign up error', error instanceof Error ? error : new Error(String(error)), { email });
    return { data: null, error: { message: 'Registration failed' } };
  }
}
