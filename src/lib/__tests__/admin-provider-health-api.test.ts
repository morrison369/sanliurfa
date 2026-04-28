import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../../pages/api/admin/site/media/provider-health';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { getImageProvidersConfigMock } = vi.hoisted(() => ({
  getImageProvidersConfigMock: vi.fn(),
}));

vi.mock('../media/image-providers-config', () => ({
  getImageProvidersConfig: getImageProvidersConfigMock,
}));

describe('GET /api/admin/site/media/provider-health', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getImageProvidersConfigMock.mockReset();
  });

  it('rejects non-admin callers', async () => {
    const response = await GET(createApiContext({ locals: { user: { role: 'user' } } }));
    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.data.error).toBe('Unauthorized');
  });

  it('returns missing provider states without exposing keys', async () => {
    getImageProvidersConfigMock.mockResolvedValue({
      pexels_api_key: '',
      unsplash_access_key: '',
    });

    const response = await GET(createApiContext({ locals: { user: { role: 'admin' } } }));
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body.data.success).toBe(true);
    expect(body.data.providers).toEqual({ pexels: 'missing', unsplash: 'missing' });
    expect(JSON.stringify(body)).not.toContain('api_key');
    expect(JSON.stringify(body)).not.toContain('access_key');
  });

  it('maps successful provider probes to working', async () => {
    getImageProvidersConfigMock.mockResolvedValue({
      pexels_api_key: 'pexels-secret',
      unsplash_access_key: 'unsplash-secret',
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const response = await GET(createApiContext({ locals: { user: { role: 'admin' } } }));
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body.data.providers).toEqual({ pexels: 'working', unsplash: 'working' });
    expect(JSON.stringify(body)).not.toContain('pexels-secret');
    expect(JSON.stringify(body)).not.toContain('unsplash-secret');
  });
});
