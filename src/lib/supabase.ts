// PostgreSQL Client - Supabase yerine
import pg from 'pg';
import crypto from 'crypto';
const { Pool } = pg;

// PostgreSQL bağlantı havuzu
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    'postgresql://sanliurfa_user:CHANGE_ME_DB_PASSWORD@localhost:5432/sanliurfa',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Session store
const sessions = new Map<string, { userId: string; email: string; expires: Date }>();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Şifre hashleme
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// Token oluşturma
function createToken(userId: string, email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  sessions.set(token, { userId, email, expires });
  return token;
}

// SQL sorgu
async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result;
}

async function queryOne(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// ==================== AUTH ====================

export async function signUp(email: string, password: string, fullName: string) {
  try {
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
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const passwordHash = hashPassword(password);
    const user = await queryOne(
      'SELECT id, email, full_name, role FROM users WHERE email = $1 AND password_hash = $2',
      [email, passwordHash]
    );

    if (!user) {
      return { data: null, error: { message: 'Invalid credentials' } };
    }

    const token = createToken(user.id, user.email);
    return { data: { user, session: { token } }, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
}

export async function signOut() {
  return { error: null };
}

export async function getCurrentUser() {
  return null;
}

export async function getSession() {
  return { session: null, error: null };
}

// ==================== SUPABASE CLIENT MOCK ====================
// Eski kodlarla uyumluluk için

const mockChannel = {
  on: () => mockChannel,
  subscribe: () => {},
};

export const supabase = {
  auth: {
    signUp: (credentials: any) => signUp(credentials.email, credentials.password, credentials.options?.data?.full_name || ''),
    signInWithPassword: (credentials: any) => signIn(credentials.email, credentials.password),
    signOut: () => signOut(),
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: () => getSession(),
  },
  from: (table: string) => ({
    select: (columns = '*') => ({
      eq: async (col: string, val: any) => {
        const result = await query(`SELECT ${columns} FROM ${table} WHERE ${col} = $1`, [val]);
        return { data: result.rows, error: null };
      },
      single: async () => {
        const result = await queryOne(`SELECT ${columns} FROM ${table} LIMIT 1`);
        return { data: result, error: null };
      },
    }),
    insert: async (data: any) => {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const result = await queryOne(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return { data: result, error: null };
    },
    update: async (data: any) => {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      return { 
        eq: async (col: string, val: any) => {
          const result = await queryOne(
            `UPDATE ${table} SET ${setClause} WHERE ${col} = $${keys.length + 1} RETURNING *`,
            [...values, val]
          );
          return { data: result, error: null };
        }
      };
    },
    delete: () => ({
      eq: async (col: string, val: any) => {
        await query(`DELETE FROM ${table} WHERE ${col} = $1`, [val]);
        return { data: null, error: null };
      },
    }),
  }),
  channel: () => mockChannel,
};

// Subscribe fonksiyonu
export function subscribeToTable(table: string, callback: (payload: any) => void) {
  console.log(`Realtime subscription to ${table} - not implemented in PostgreSQL mode`);
  return { unsubscribe: () => {} };
}

// Export pool for direct use
export { pool };
