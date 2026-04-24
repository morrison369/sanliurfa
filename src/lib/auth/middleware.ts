/**
 * Authentication Middleware
 * API route authentication helpers that read from Astro locals
 * (set by src/middleware.ts on every request)
 */

import type { APIContext } from 'astro';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'vendor' | 'user' | 'moderator';
  placeId?: string;
}

/**
 * Get authenticated user from Astro context.
 * Returns null if not authenticated.
 */
export async function authenticateUser(
  context: APIContext
): Promise<{ user: AuthenticatedUser; placeId?: string } | null> {
  const localUser = (context as any).locals?.user;

  if (!localUser) {
    return null;
  }

  return {
    user: {
      id: localUser.id,
      email: localUser.email,
      name: localUser.fullName || localUser.email,
      role: localUser.role || 'user',
    },
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
