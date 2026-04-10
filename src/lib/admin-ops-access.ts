import type { APIContext } from 'astro';
import { apiError, ErrorCode, HttpStatus } from './api';
import { appendAdminOpsAuditEntry } from './admin-ops-audit';
import { logger } from './logging';
import { rateLimiter } from './rate-limiter';

type AdminLikeLocals = APIContext['locals'] & {
  isAdmin?: boolean;
  user?: { id?: string; role?: string } | null;
};

type AdminOpsMode = 'read' | 'write';

const ADMIN_OPS_READ_RATE_LIMIT_NAME = 'admin-ops-read';
const ADMIN_OPS_WRITE_RATE_LIMIT_NAME = 'admin-ops-write';

rateLimiter.configure(ADMIN_OPS_READ_RATE_LIMIT_NAME, {
  limit: 120,
  windowMs: 60_000,
  algorithm: 'sliding-window',
});

rateLimiter.configure(ADMIN_OPS_WRITE_RATE_LIMIT_NAME, {
  limit: 30,
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

function getRateLimitName(mode: AdminOpsMode): string {
  return mode === 'write' ? ADMIN_OPS_WRITE_RATE_LIMIT_NAME : ADMIN_OPS_READ_RATE_LIMIT_NAME;
}

function logAdminOpsEvent(options: {
  endpoint: string;
  method: string;
  mode: AdminOpsMode;
  request: Request;
  locals: AdminLikeLocals;
  statusCode: number;
  duration: number;
  outcome: 'allowed' | 'denied' | 'error';
  details?: Record<string, unknown>;
}): void {
  const actorKey = getActorKey(options.request, options.locals);
  const ipAddress = getClientIp(options.request);
  const context = {
    endpoint: options.endpoint,
    method: options.method,
    mode: options.mode,
    actorKey,
    requestId: options.request.headers.get('x-request-id') || null,
    userId: options.locals.user?.id ?? null,
    ipAddress,
    statusCode: options.statusCode,
    duration: options.duration,
    outcome: options.outcome,
    ...(options.details ?? {}),
  };

  appendAdminOpsAuditEntry({
    timestamp: new Date().toISOString(),
    endpoint: options.endpoint,
    method: options.method,
    mode: options.mode,
    requestId: options.request.headers.get('x-request-id') || null,
    actorKey,
    userId: options.locals.user?.id ?? null,
    ipAddress,
    statusCode: options.statusCode,
    duration: options.duration,
    outcome: options.outcome,
    details: options.details,
  });

  if (options.outcome === 'error') {
    logger.error('Admin ops access error', context);
  } else if (options.outcome === 'denied') {
    logger.warn('Admin ops access denied', context);
  } else {
    logger.info(`Admin ops ${options.mode} audit`, context);
  }
}

function ensureAdminOpsAccess(options: {
  request: Request;
  locals: AdminLikeLocals;
  endpoint: string;
  requestId?: string;
  startTime: number;
  mode: AdminOpsMode;
}): Response | null {
  const { request, locals, endpoint, requestId, startTime, mode } = options;
  const actorKey = getActorKey(request, locals);
  const ipAddress = getClientIp(request);

  if (!hasAdminAccess(locals)) {
    logger.warn('Admin ops access denied', {
      endpoint,
      mode,
      actorKey,
      ipAddress,
      status: HttpStatus.FORBIDDEN,
      duration: Date.now() - startTime,
    });
    return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
  }

  const rateLimit = rateLimiter.check(getRateLimitName(mode), actorKey);
  if (!rateLimit.allowed) {
    logger.warn('Admin ops rate limit exceeded', {
      endpoint,
      mode,
      actorKey,
      ipAddress,
      retryAfter: rateLimit.retryAfter,
      status: HttpStatus.RATE_LIMITED,
      duration: Date.now() - startTime,
    });
    return apiError(
      ErrorCode.RATE_LIMITED,
      `Admin ops ${mode} rate limit exceeded`,
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
    mode,
    actorKey,
    ipAddress,
    remaining: rateLimit.remaining,
  });
  return null;
}

export function resetAdminOpsRateLimitForTests(
  request: Request,
  locals: AdminLikeLocals,
  mode?: AdminOpsMode
): void {
  const actorKey = getActorKey(request, locals);
  if (!mode || mode === 'read') {
    rateLimiter.reset(ADMIN_OPS_READ_RATE_LIMIT_NAME, actorKey);
  }
  if (!mode || mode === 'write') {
    rateLimiter.reset(ADMIN_OPS_WRITE_RATE_LIMIT_NAME, actorKey);
  }
}

export function ensureAdminOpsReadAccess(options: {
  request: Request;
  locals: AdminLikeLocals;
  endpoint: string;
  requestId?: string;
  startTime: number;
}): Response | null {
  return ensureAdminOpsAccess({ ...options, mode: 'read' });
}

export function ensureAdminOpsWriteAccess(options: {
  request: Request;
  locals: AdminLikeLocals;
  endpoint: string;
  requestId?: string;
  startTime: number;
}): Response | null {
  return ensureAdminOpsAccess({ ...options, mode: 'write' });
}

export async function withAdminOpsReadAccess(options: {
  endpoint: string;
  request: Request;
  locals: AdminLikeLocals;
  requestId?: string;
  startTime: number;
  onDenied?: (response: Response, statusCode: number, duration: number) => void;
  onSuccess?: (response: Response, duration: number) => void;
}, handler: () => Promise<Response>): Promise<Response> {
  return withAdminOpsAccess({ ...options, mode: 'read' }, handler);
}

export async function withAdminOpsWriteAccess(options: {
  endpoint: string;
  request: Request;
  locals: AdminLikeLocals;
  requestId?: string;
  startTime: number;
  onDenied?: (response: Response, statusCode: number, duration: number) => void;
  onSuccess?: (response: Response, duration: number) => void;
}, handler: () => Promise<Response>): Promise<Response> {
  return withAdminOpsAccess({ ...options, mode: 'write' }, handler);
}

async function withAdminOpsAccess(options: {
  endpoint: string;
  request: Request;
  locals: AdminLikeLocals;
  requestId?: string;
  startTime: number;
  mode: AdminOpsMode;
  onDenied?: (response: Response, statusCode: number, duration: number) => void;
  onSuccess?: (response: Response, duration: number) => void;
}, handler: () => Promise<Response>): Promise<Response> {
  const denied = ensureAdminOpsAccess({
    request: options.request,
    locals: options.locals,
    endpoint: options.endpoint,
    requestId: options.requestId,
    startTime: options.startTime,
    mode: options.mode,
  });

  if (denied) {
    const duration = Date.now() - options.startTime;
    options.onDenied?.(denied, denied.status, duration);
    logAdminOpsEvent({
      endpoint: options.endpoint,
      method: options.request.method,
      mode: options.mode,
      request: options.request,
      locals: options.locals,
      statusCode: denied.status,
      duration,
      outcome: 'denied',
    });
    return denied;
  }

  try {
    const response = await handler();
    const duration = Date.now() - options.startTime;
    options.onSuccess?.(response, duration);
    logAdminOpsEvent({
      endpoint: options.endpoint,
      method: options.request.method,
      mode: options.mode,
      request: options.request,
      locals: options.locals,
      statusCode: response.status,
      duration,
      outcome: 'allowed',
    });
    return response;
  } catch (error) {
    logAdminOpsEvent({
      endpoint: options.endpoint,
      method: options.request.method,
      mode: options.mode,
      request: options.request,
      locals: options.locals,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      duration: Date.now() - options.startTime,
      outcome: 'error',
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

export function logAdminOpsRead(options: {
  endpoint: string;
  request: Request;
  locals: AdminLikeLocals;
  statusCode: number;
  duration: number;
  details?: Record<string, unknown>;
}): void {
  logAdminOpsEvent({
    endpoint: options.endpoint,
    method: options.request.method,
    mode: 'read',
    request: options.request,
    locals: options.locals,
    statusCode: options.statusCode,
    duration: options.duration,
    outcome: options.statusCode >= HttpStatus.BAD_REQUEST ? 'denied' : 'allowed',
    details: options.details,
  });
}

export function logAdminOpsWrite(options: {
  endpoint: string;
  request: Request;
  locals: AdminLikeLocals;
  statusCode: number;
  duration: number;
  details?: Record<string, unknown>;
}): void {
  logAdminOpsEvent({
    endpoint: options.endpoint,
    method: options.request.method,
    mode: 'write',
    request: options.request,
    locals: options.locals,
    statusCode: options.statusCode,
    duration: options.duration,
    outcome: options.statusCode >= HttpStatus.BAD_REQUEST ? 'denied' : 'allowed',
    details: options.details,
  });
}
