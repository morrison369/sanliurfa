import { apiError, ErrorCode, HttpStatus } from './api';
import { checkRateLimit } from './cache';

export function getClientIpAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const candidate = forwarded.split(',')[0]?.trim();
    if (candidate) return candidate;
  }

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  return '127.0.0.1';
}

export async function enforceRateLimitPolicy(options: {
  request: Request;
  requestId: string;
  key: string;
  limit: number;
  windowSeconds: number;
  message?: string;
}): Promise<Response | null> {
  const allowed = await checkRateLimit(options.key, options.limit, options.windowSeconds);

  if (allowed) {
    return null;
  }

  return apiError(
    ErrorCode.RATE_LIMITED,
    options.message || 'Too many requests',
    HttpStatus.RATE_LIMITED,
    {
      retryAfterSeconds: options.windowSeconds
    },
    options.requestId
  );
}
