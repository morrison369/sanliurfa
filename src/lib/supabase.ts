// Supabase API Compatibility Layer
// This provides backward compatibility for code using Supabase-style API
// Actual database operations delegate to postgres.ts

import { pool, query, queryOne, queryRows, insert } from './postgres';
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

// ==================== SUPABASE CLIENT COMPAT ====================
// Provides a minimal Supabase-style API surface for backward compatibility

type RealtimePayload = {
  eventType: string;
  schema: string;
  table?: string;
  new: any;
  old: any;
  commit_timestamp: string;
};

type ChannelHandler = {
  type: string;
  filter: Record<string, any> | null;
  callback: (payload: RealtimePayload) => void;
};

type RealtimeHandler = (payload: RealtimePayload) => void;

type CompatChannel = {
  name: string;
  on: (type: string, filter: Record<string, any> | RealtimeHandler, callback?: RealtimeHandler) => CompatChannel;
  subscribe: (callback?: (status: string) => void) => CompatChannel;
  unsubscribe: () => void;
  emit: (payload: Partial<RealtimePayload>) => void;
};

const realtimeChannels = new Set<CompatChannel>();

function buildRealtimePayload(payload: Partial<RealtimePayload>): RealtimePayload {
  return {
    eventType: payload.eventType || 'SYNC',
    schema: payload.schema || 'public',
    table: payload.table,
    new: payload.new ?? null,
    old: payload.old ?? null,
    commit_timestamp: payload.commit_timestamp || new Date().toISOString()
  };
}

function createCompatChannel(name: string): CompatChannel {
  const handlers: ChannelHandler[] = [];
  let subscribed = false;

  const channel: CompatChannel = {
    name,
    on: (type, filter, callback) => {
      if (typeof filter === 'function') {
        handlers.push({ type, filter: null, callback: filter as RealtimeHandler });
      } else if (callback) {
        handlers.push({ type, filter, callback });
      }
      return channel;
    },
    subscribe: (callback) => {
      if (subscribed) {
        queueMicrotask(() => {
          callback?.('SUBSCRIBED');
        });
        return channel;
      }

      subscribed = true;
      realtimeChannels.add(channel);
      queueMicrotask(() => {
        callback?.('SUBSCRIBED');
      });
      return channel;
    },
    unsubscribe: () => {
      if (!subscribed) return;
      subscribed = false;
      realtimeChannels.delete(channel);
      logger.debug('Supabase compat channel unsubscribed', { name });
    },
    emit: (payload) => {
      if (!subscribed) return;
      const normalized = buildRealtimePayload(payload);
      handlers.forEach(handler => {
        if (handler.type !== 'postgres_changes' && handler.type !== normalized.eventType) {
          return;
        }

        if (handler.filter?.table && normalized.table && handler.filter.table !== normalized.table) {
          return;
        }

        if (handler.filter?.table && !normalized.table) {
          return;
        }

        if (handler.filter?.schema && handler.filter.schema !== normalized.schema) {
          return;
        }

        if (handler.filter?.event && handler.filter.event !== normalized.eventType) {
          return;
        }

        handler.callback(normalized);
      });
    }
  };

  return channel;
}

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
          const result = await queryRows(`SELECT ${columns} FROM ${table} WHERE ${col} = $1`, [val]);
          return { data: result, error: null };
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

  channel: (name = 'realtime') => createCompatChannel(name),
};

export function subscribeToTable(table: string, callback: (payload: any) => void) {
  const channel = createCompatChannel(`table:${table}`)
    .on('postgres_changes', { table }, callback)
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        try {
          callback(buildRealtimePayload({ eventType: 'SUBSCRIBED', table }));
        } catch (error) {
          logger.error('Supabase compat subscription callback failed', error instanceof Error ? error : new Error(String(error)), { table });
        }
      }
    });

  logger.info('Supabase compat subscription established', { table, mode: 'postgres-compat' });
  return {
    unsubscribe: () => channel.unsubscribe()
  };
}

export function notifyRealtime(table: string, payload: Partial<RealtimePayload> = {}) {
  const normalized = buildRealtimePayload({ ...payload, table });
  realtimeChannels.forEach(channel => channel.emit(normalized));
  logger.debug('Supabase compat realtime notified', { table, eventType: normalized.eventType });
}

export { pool };
