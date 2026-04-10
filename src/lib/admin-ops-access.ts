import type { APIContext } from 'astro';
import { apiError, ErrorCode, HttpStatus } from './api';
import { logger } from './logging';
import { rateLimiter } from './rate-limiter';

type AdminLikeLocals = APIContext['locals'] & {
  isAdmin?: boolean;
  user?: { id?: string; role?: string } | null;
};

const ADMIN_OPS_RATE_LIMIT_NAME = 'admin-ops-read';
rateLimiter.configure(ADMIN_OPS_RATE_LIMIT_NAME, {
  limit: 120,
  windowMs: 60_000,
  algorithm: 'sliding-window',
});

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  );
}

function getActorKey(request: Request, locals: AdminLikeLocals): string {
  return locals.user?.id || getClientIp(request);
}

function hasAdminAccess(locals: AdminLikeLocals): boolean {
  if (locals.isAdmin) return true;
  return Boolean(locals.user && locals.user.role === 'admin');
}

export function resetAdminOpsRateLimitForTests(request: Request, locals: AdminLikeLocals): void {
  rateLimiter.reset(ADMIN_OPS_RATE_LIMIT_NAME, getActorKey(request, locals));
}

export function ensureAdminOpsReadAccess(options: {
  request: Request;
  locals: AdminLikeLocals;
  endpoint: string;
  requestId?: string;
  startTime: number;
}): Response | null {
  const { request, locals, endpoint, requestId, startTime } = options;
  const actorKey = getActorKey(request, locals);
  const ipAddress = getClientIp(request);

  if (!hasAdminAccess(locals)) {
    logger.warn('Admin ops access denied', {
      endpoint,
      actorKey,
      ipAddress,
      status: HttpStatus.FORBIDDEN,
      duration: Date.now() - startTime,
    });
    return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
  }

  const rateLimit = rateLimiter.check(ADMIN_OPS_RATE_LIMIT_NAME, actorKey);
  if (!rateLimit.allowed) {
    logger.warn('Admin ops rate limit exceeded', {
      endpoint,
      actorKey,
      ipAddress,
      retryAfter: rateLimit.retryAfter,
      status: HttpStatus.RATE_LIMITED,
      duration: Date.now() - startTime,
    });
    return apiError(
      ErrorCode.RATE_LIMITED,
      'Admin ops rate limit exceeded',
      HttpStatus.RATE_LIMITED,
      {
        endpoint,
        retryAfter: rateLimit.retryAfter,
        resetAt: rateLimit.resetAt,
      },
      requestId
    );
  }

  logger.info('Admin ops access granted', {
    endpoint,
    actorKey,
    ipAddress,
    remaining: rateLimit.remaining,
  });
  return null;
}

export function logAdminOpsRead(options: {
  endpoint: string;
  request: Request;
  locals: AdminLikeLocals;
  statusCode: number;
  duration: number;
}): void {
  logger.info('Admin ops read audit', {
    endpoint: options.endpoint,
    actorKey: getActorKey(options.request, options.locals),
    ipAddress: getClientIp(options.request),
    statusCode: options.statusCode,
    duration: options.duration,
  });
}
