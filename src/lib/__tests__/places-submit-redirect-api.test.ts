/**
 * API Contract Tests - POST /api/places/submit
 *
 * Legacy backwards-compat endpoint — 308 permanent redirect to /api/places/apply.
 * Lock test prevents accidental restoration of write logic to this URL.
 *
 * - Returns 308 status
 * - Location header → /api/places/apply
 */

import { describe, it, expect } from 'vitest';
import { POST } from '../../pages/api/places/submit';

describe('POST /api/places/submit (legacy redirect)', () => {
  it('308 permanent redirect to /api/places/apply', async () => {
    const ctx = {
      redirect: (url: string, status: number) => new Response(null, {
        status,
        headers: { Location: url },
      }),
    } as any;
    const resp = await POST(ctx);
    expect(resp.status).toBe(308);
    expect(resp.headers.get('Location')).toBe('/api/places/apply');
  });

  it('always 308 — never 200/302/307 (HTTP method preserve)', async () => {
    // 308 specifies that method/body MUST be preserved (POST stays POST)
    // 302/307 are not permanent — clients may revert
    let capturedStatus = 0;
    const ctx = {
      redirect: (_url: string, status: number) => {
        capturedStatus = status;
        return new Response(null, { status, headers: {} });
      },
    } as any;
    await POST(ctx);
    expect(capturedStatus).toBe(308);
  });
});
