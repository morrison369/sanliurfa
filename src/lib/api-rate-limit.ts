import { checkRateLimit } from './cache';
import { getClientIdentifier } from './request-client-id';

function getClientIpFromRequest(request: Request): string {
  return getClientIdentifier(request);
}

export async function enforceApiRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
  userId?: string
): Promise<boolean> {
  const clientIp = getClientIpFromRequest(request);
  const safeScope = scope.trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '-');
  const userPart = userId && userId.length > 0 ? `user:${userId}` : 'user:anonymous';
  const key = `api:${safeScope}:${userPart}:ip:${clientIp}`;
  return checkRateLimit(key, limit, windowSeconds);
}
