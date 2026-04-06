import pg from 'pg';
const { Pool } = pg;

// PostgreSQL bağlantı havuzu
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://sanliurfa_user:CHANGE_ME_DB_PASSWORD@localhost:5432/sanliurfa',
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Bağlantı hatalarını logla
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// SQL sorgu fonksiyonu
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
}

// Tek satır getir
export async function queryOne(text: string, params?: any[]) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

// Transaction desteği
export async function transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ==================== AUTH (Basit Session-Based) ====================

import crypto from 'crypto';

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Basit session store (production'da Redis kullanılmalı)
const sessions = new Map<string, { userId: string; email: string; expires: Date }>();

// Şifre hashleme
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// Token oluşturma
function createToken(userId: string, email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + 24); // 24 saat
  sessions.set(token, { userId, email, expires });
  return token;
}

// Kullanıcı kayıt
export async function signUp(email: string, password: string, fullName: string) {
  try {
    // Email kontrolü
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return { data: null, error: { message: 'Email already registered' } };
    }

    // Kullanıcı oluştur
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

// Kullanıcı giriş
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
    return { data: { user, token, session: { token } }, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
}

// Çıkış
export async function signOut(token?: string) {
  if (token) {
    sessions.delete(token);
  }
  return { error: null };
}

// Mevcut kullanıcı
export async function getCurrentUser(token?: string) {
  if (!token) return null;
  
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

// Session kontrolü
export async function getSession(token?: string) {
  if (!token) return { session: null, error: null };
  
  const session = sessions.get(token);
  if (!session || session.expires < new Date()) {
    sessions.delete(token);
    return { session: null, error: null };
  }

  return { session: { user: { id: session.userId, email: session.email } }, error: null };
}

// ==================== DATABASE HELPERS ====================

// Tablodan tüm verileri getir
export async function getAll(table: string, options?: { limit?: number; offset?: number }) {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  const result = await query(`SELECT * FROM ${table} LIMIT $1 OFFSET $2`, [limit, offset]);
  return result.rows;
}

// ID'ye göre getir
export async function getById(table: string, id: string) {
  return await queryOne(`SELECT * FROM ${table} WHERE id = $1`, [id]);
}

// Slug'a göre getir
export async function getBySlug(table: string, slug: string) {
  return await queryOne(`SELECT * FROM ${table} WHERE slug = $1`, [slug]);
}

// Ekle
export async function insert(table: string, data: Record<string, any>) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
  
  const result = await queryOne(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return result;
}

// Güncelle
export async function update(table: string, id: string, data: Record<string, any>) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  
  const result = await queryOne(
    `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result;
}

// Sil
export async function remove(table: string, id: string) {
  await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return { success: true };
}

// ==================== BACKWARD COMPATIBILITY ====================

// Eski Supabase client API'siyle uyumlu basit bir wrapper
export const db = {
  from: (table: string) => ({
    select: async (columns = '*') => {
      const result = await query(`SELECT ${columns} FROM ${table}`);
      return { data: result.rows, error: null };
    },
    selectOne: async (columns = '*') => {
      const result = await queryOne(`SELECT ${columns} FROM ${table}`);
      return { data: result, error: null };
    },
    eq: async (column: string, value: any) => {
      const result = await query(`SELECT * FROM ${table} WHERE ${column} = $1`, [value]);
      return { data: result.rows, error: null };
    },
    eqOne: async (column: string, value: any) => {
      const result = await queryOne(`SELECT * FROM ${table} WHERE ${column} = $1`, [value]);
      return { data: result, error: null };
    },
    insert: async (data: any) => {
      const result = await insert(table, data);
      return { data: result, error: null };
    },
    update: async (data: any) => {
      if (data.id) {
        const { id, ...rest } = data;
        const result = await update(table, id, rest);
        return { data: result, error: null };
      }
      return { data: null, error: { message: 'ID required' } };
    },
    delete: async () => {
      return { data: null, error: { message: 'Use remove() instead' } };
    },
  }),
};

// Pool export
export { pool };
export default pool;
