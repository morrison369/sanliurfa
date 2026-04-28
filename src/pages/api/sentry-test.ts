import type { APIRoute } from 'astro';
import { captureException, flushSentry, initSentry } from '../../lib/observability/sentry';

const PROBLEM_JSON = 'application/problem+json; charset=utf-8';

function problem(status: number, title: string, detail: string): Response {
  return new Response(
    JSON.stringify({
      type: 'about:blank',
      title,
      status,
      detail,
    }),
    {
      status,
      headers: { 'content-type': PROBLEM_JSON },
    },
  );
}

function isEnabled(): boolean {
  return process.env.SENTRY_TEST_ERROR_ENABLED === 'true';
}

function isAuthorized(request: Request): boolean {
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token && process.env.NODE_ENV !== 'production') return true;
  if (!token) return false;

  const authorization = request.headers.get('authorization') || '';
  return authorization === `Bearer ${token}`;
}

export const GET: APIRoute = async ({ request }) => {
  if (!isEnabled()) {
    return problem(404, 'Not Found', 'Sentry test endpoint disabled');
  }

  if (!isAuthorized(request)) {
    return problem(401, 'Unauthorized', 'Internal API token is required');
  }

  await initSentry();

  try {
    const myUndefinedFunction = undefined as unknown as () => void;
    myUndefinedFunction();
  } catch (error) {
    const captured = error instanceof Error ? error : new Error(String(error));
    captureException(captured, {
      source: 'api/sentry-test',
      verification: 'myUndefinedFunction',
    });
    const flushed = await flushSentry();

    return problem(
      500,
      'Sentry Test Error Captured',
      `Verification error captured and flush ${flushed ? 'completed' : 'skipped or failed'}`,
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
