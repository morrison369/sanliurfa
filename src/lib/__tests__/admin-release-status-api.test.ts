import { describe, expect, it } from 'vitest';
import { GET } from '../../pages/api/admin/system/release-status';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

describe('GET /api/admin/system/release-status', () => {
  it('rejects non-admin callers', async () => {
    const response = await GET(createApiContext({ locals: { user: { role: 'user' } } }));
    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.data.error).toBe('Unauthorized');
  });

  it('surfaces release evidence for admin system health', async () => {
    const response = await GET(createApiContext({ locals: { user: { role: 'admin' } } }));
    const body = await parseJson(response);
    const payload = body.data;

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.releaseStatus.status).toBe('ready');
    expect(payload.releaseEvidence.status).toBe('ready');
    expect(payload.releaseEvidence.totals.blocked).toBe(0);
    expect(payload.releaseEvidence.totals.ok).toBeGreaterThan(0);
    expect(payload.prodEvidence.status).toBeDefined();
    expect(payload.backupRestoreEvidence.status).toBeDefined();
    expect(payload.runtimeProdDoctor.status).toBeDefined();
    expect(payload.siteDoctor.status).toBe('ready');
    expect(payload.criticalPages.status).toBe('ok');
  });
});
