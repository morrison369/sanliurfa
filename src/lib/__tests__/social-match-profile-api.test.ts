import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { requireAuthMock, getMatchProfileMock, upsertMatchProfileMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
  getMatchProfileMock: vi.fn(),
  upsertMatchProfileMock: vi.fn(),
}));

vi.mock('../auth', () => ({
  requireAuth: requireAuthMock,
}));

vi.mock('../social/matchmaking-db', () => ({
  getMatchProfile: getMatchProfileMock,
  upsertMatchProfile: upsertMatchProfileMock,
}));

import { GET, POST } from '../../pages/api/social/match-profile';

describe('social match profile api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns 401 when unauthenticated', async () => {
    requireAuthMock.mockResolvedValueOnce({ user: null });

    const response = await GET(createApiContext({ url: 'http://localhost/api/social/match-profile' }));
    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body?.title || body?.error).toBe('Unauthorized');
  });

  it('GET returns default profile when no profile exists', async () => {
    requireAuthMock.mockResolvedValueOnce({ user: { id: 'u1' } });
    getMatchProfileMock.mockResolvedValueOnce(null);

    const response = await GET(createApiContext({ url: 'http://localhost/api/social/match-profile' }));
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.success).toBe(true);
    expect(body?.data?.bio).toBe('');
    expect(Array.isArray(body?.data?.photos)).toBe(true);
  });

  it('POST validates max 4 photos', async () => {
    requireAuthMock.mockResolvedValueOnce({ user: { id: 'u1' } });

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/social/match-profile',
        method: 'POST',
        body: { bio: 'test', photos: ['1', '2', '3', '4', '5'] },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body?.detail || body?.error).toContain('En fazla 4 fotoğraf');
  });

  it('POST stores discoverable profile and trims to 4 photos', async () => {
    requireAuthMock.mockResolvedValueOnce({ user: { id: 'u1' } });
    upsertMatchProfileMock.mockResolvedValueOnce({
      user_id: 'u1',
      bio: 'Merhaba',
      photos: ['a', 'b', 'c', 'd'],
      is_discoverable: true,
    });

    const response = await POST(
      createApiContext({
        url: 'http://localhost/api/social/match-profile',
        method: 'POST',
        body: {
          bio: 'Merhaba',
          photos: ['a', 'b', 'c', 'd'],
          isDiscoverable: true,
        },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.success ?? body?.success).toBe(true);
    expect(upsertMatchProfileMock).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        bio: 'Merhaba',
        photos: ['a', 'b', 'c', 'd'],
        isDiscoverable: true,
      }),
    );
  });
});
