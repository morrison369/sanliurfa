import { describe, expect, it } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';
import { GET } from '../../pages/api/admin/site/media-health';

describe('GET /api/admin/site/media-health', () => {
  it('requires admin access', async () => {
    const response = await GET(createApiContext({ locals: { user: { role: 'vendor' } } }));

    expect(response.status).toBe(401);
  });

  it('returns local storage parity and quota snapshot for admins', async () => {
    const response = await GET(createApiContext({ locals: { user: { role: 'admin' } } }));
    const body = await parseJson(response);
    const data = body?.data?.data;

    expect(response.status).toBe(200);
    expect(data?.storageModel).toBe('local-filesystem');
    expect(data?.uploadParity).toEqual(
      expect.objectContaining({
        status: expect.any(String),
        quota: expect.any(Object),
        ownershipModel: expect.any(Array),
      }),
    );
  });
});
