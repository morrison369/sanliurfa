export interface AdminLikeUser {
  role?: string | null;
}

export function isAdminRole(user: AdminLikeUser | null | undefined): boolean {
  if (!user?.role) {
    return false;
  }

  return user.role === 'admin' || user.role === 'moderator';
}

export function requireAdminRedirectPath(user: AdminLikeUser | null | undefined): string | null {
  return isAdminRole(user) ? null : '/';
}
