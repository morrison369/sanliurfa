import { checkRateLimit } from './cache';

function getClientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',').map((entry) => entry.trim()).find((entry) => entry.length > 0);
    if (ip) {
      return ip;
    }
  }

  return request.headers.get('x-real-ip') || 'unknown';
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
