// Auth utilities - PostgreSQL based
import crypto from 'crypto';
import { queryOne } from './postgres';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Simple session store (use Redis in production)
const sessions = new Map<string, { userId: string; email: string; role: string; expires: Date }>();

// Hash password
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// Create token
export function createToken(userId: string, email: string, role: string = 'user'): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + 24); // 24 hours
  sessions.set(token, { userId, email, role, expires });
  return token;
}

// Verify token
export async function verifyToken(token: string): Promise<{ id: string; email: string; role: string } | null> {
  const session = sessions.get(token);
  if (!session || session.expires < new Date()) {
    sessions.delete(token);
    return null;
  }
  return { id: session.userId, email: session.email, role: session.role };
}

// Get current user from token
export async function getCurrentUser(token: string): Promise<any> {
  const session = sessions.get(token);
  if (!session || session.expires < new Date()) {
    sessions.delete(token);
    return null;
  }
  
  const user = await queryOne(
    'SELECT id, email, full_name, role, points, level, avatar_url FROM users WHERE id = $1',
    [session.userId]
  );
  
  return user;
}

// Sign out
export function signOut(token: string): void {
  sessions.delete(token);
}

// Sign in
export async function signIn(email: string, password: string) {
  const passwordHash = hashPassword(password);
  const user = await queryOne(
    'SELECT id, email, full_name, role FROM users WHERE email = $1 AND password_hash = $2',
    [email, passwordHash]
  );

  if (!user) {
    return { data: null, error: { message: 'Invalid credentials' } };
  }

  const token = createToken(user.id, user.email, user.role);
  return { data: { user, token }, error: null };
}

// Sign up
export async function signUp(email: string, password: string, fullName: string) {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    return { data: null, error: { message: 'Email already registered' } };
  }

  const passwordHash = hashPassword(password);
  const result = await queryOne(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
    [email, passwordHash, fullName, 'user']
  );

  return { data: { user: result }, error: null };
}
