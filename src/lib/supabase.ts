// Supabase API Compatibility Layer
// This provides backward compatibility for code using Supabase-style API
// Actual database operations delegate to postgres.ts

import { pool, query, queryOne, insert } from './postgres';
import * as auth from './auth';
import { logger } from './logging';

// ==================== AUTH DELEGATION ====================

/**
 * Sign up - delegates to auth.ts
 */
export async function signUp(email: string, password: string, fullName: string) {
  return auth.signUp(email, password, fullName);
}

/**
 * Sign in - delegates to auth.ts
 */
export async function signIn(email: string, password: string) {
  try {
    const result = await auth.signIn(email, password);
    if (result.error) {
      return result;
    }
    return { data: { user: result.data?.user, session: { access_token: result.data?.token } }, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
}

/**
 * Sign out - delegates to auth.ts
 */
export async function signOut(token?: string) {
  if (token) {
    await auth.signOut(token);
  }
  return { error: null };
}

/**
 * Get current user - delegates to auth.ts
 */
export async function getCurrentUser(token?: string) {
  if (!token) return null;
  return auth.getCurrentUser(token);
}

/**
 * Get session - delegates to auth.ts
 */
export async function getSession(token?: string) {
  if (!token) {
    return { session: null, error: null };
  }
  const sessionData = await auth.verifyToken(token);
  if (!sessionData) {
    return { session: null, error: null };
  }
  return { session: { user: { id: sessionData.userId, email: sessionData.email } }, error: null };
}

// ==================== SUPABASE CLIENT MOCK ====================
// Provides Supabase-style API for backward compatibility

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
        try {
          const result = await query(`SELECT ${columns} FROM ${table} WHERE ${col} = $1`, [val]);
          return { data: result.rows, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      single: async () => {
        try {
          const result = await queryOne(`SELECT ${columns} FROM ${table} LIMIT 1`);
          return { data: result, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
    }),

    insert: async (data: any) => {
      try {
        const result = await insert(table, data);
        return { data: result, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },

    update: async (data: any) => {
      return {
        eq: async (col: string, val: any) => {
          try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
            const result = await queryOne(`UPDATE ${table} SET ${setClause} WHERE ${col} = $${keys.length + 1} RETURNING *`, [
              ...values,
              val
            ]);
            return { data: result, error: null };
          } catch (error) {
            return { data: null, error };
          }
        }
      };
    },

    delete: () => ({
      eq: async (col: string, val: any) => {
        try {
          await query(`DELETE FROM ${table} WHERE ${col} = $1`, [val]);
          return { data: null, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
    }),
  }),

  channel: () => mockChannel,
};

export function subscribeToTable(table: string, callback: (payload: any) => void) {
  const channel = {
    unsubscribe: () => {
      logger.debug('Supabase compat subscription unsubscribed', { table });
    }
  };

  queueMicrotask(() => {
    try {
      callback({ eventType: 'SUBSCRIBED', new: null, old: null, table });
    } catch (error) {
      logger.error('Supabase compat subscription callback failed', error instanceof Error ? error : new Error(String(error)), { table });
    }
  });

  logger.info('Supabase compat subscription established', { table, mode: 'postgres-compat' });
  return channel;
}

export { pool };
