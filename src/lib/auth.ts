// Auth utilities - PostgreSQL based with bcrypt + Redis sessions
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { queryOne } from './postgres';
import { setCache, getCache, deleteCache, isRedisAvailable } from './cache';

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

  // Try to store in Redis, fallback to console warning
  try {
    await setCache(`session:${token}`, sessionData, SESSION_TTL);
  } catch (error) {
    console.error('Failed to create session in Redis:', error);
    if (isRedisAvailable()) {
      throw new Error('Session creation failed');
    }
    // If Redis isn't available, log warning but continue (graceful degradation)
    console.warn('Redis unavailable - session may not persist across restarts');
  }

  return token;
}

/**
 * Verify a session token and return session data
 * Also performs sliding window: refreshes TTL if token is valid
 */
export async function verifyToken(token: string): Promise<SessionData | null> {
  try {
    const sessionData = await getCache<SessionData>(`session:${token}`);

    if (!sessionData) {
      return null;
    }

    // Sliding window: refresh TTL on each verification
    await setCache(`session:${token}`, sessionData, SESSION_TTL);

    return sessionData;
  } catch (error) {
    console.error('Token verification error:', error);
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
  try {
    await deleteCache(`session:${token}`);
  } catch (error) {
    console.error('Sign out error:', error);
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
          console.info('Password hash upgraded to bcrypt for user:', email);
        } catch (upgradeError) {
          console.error('Failed to upgrade password hash:', upgradeError);
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
    console.error('Sign in error:', error);
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
    console.error('Sign up error:', error);
    return { data: null, error: { message: 'Registration failed' } };
  }
}
