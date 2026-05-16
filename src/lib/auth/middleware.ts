/**
 * Authentication Middleware
 * API route authentication helpers that read from Astro locals
 * (set by src/middleware.ts on every request)
 */

import type { APIContext } from 'astro';
import { queryMany } from '../postgres';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'vendor' | 'user' | 'moderator';
  placeId?: string;
  placeIds?: string[];
}

/**
 * Get authenticated user from Astro context.
 * Returns null if not authenticated.
 */
export async function authenticateUser(
  context: APIContext
): Promise<{ user: AuthenticatedUser; placeId?: string; placeIds?: string[] } | null> {
  const localUser = (context as any).locals?.user;

  if (!localUser) {
    return null;
  }

  let placeIds: string[] = [];
  if (localUser.role === 'vendor') {
    try {
      const places = await queryMany<{ id: string }>(
        `SELECT id
         FROM places
         WHERE owner_id = $1 AND status != 'deleted'
         ORDER BY created_at DESC`,
        [localUser.id]
      );
      placeIds = places.map((place) => place.id);
    } catch {
      placeIds = [];
    }
  }

  return {
    user: {
      id: localUser.id,
      email: localUser.email,
      name: localUser.fullName || localUser.email,
      role: localUser.role || 'user',
      ...(placeIds.length > 0 ? { placeId: placeIds[0], placeIds } : {}),
    },
    ...(placeIds.length > 0 ? { placeId: placeIds[0], placeIds } : {}),
  };
}

export async function requireAuth(
  context: APIContext
): Promise<AuthenticatedUser | null> {
  const auth = await authenticateUser(context);
  return auth?.user || null;
}

/**
 * Require specific role(s) — returns user or null
 */
export async function requireRole(
  context: APIContext,
  roles: string[]
): Promise<AuthenticatedUser | null> {
  const auth = await authenticateUser(context);
  if (!auth) return null;
  if (!roles.includes(auth.user.role)) return null;
  return auth.user;
}
