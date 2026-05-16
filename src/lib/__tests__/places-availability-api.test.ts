import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const { queryMock, loggerErrorMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

vi.mock('../logger', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

import { GET } from '../../pages/api/places/[id]/availability';

describe('GET /api/places/:id/availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires place id', async () => {
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places//availability?date=2026-06-15',
        params: {},
      }),
    );

    expect(response.status).toBe(400);
  });

  it('requires YYYY-MM-DD date', async () => {
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/place-1/availability?date=15-06-2026',
        params: { id: 'place-1' },
      }),
    );

    expect(response.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('returns 404 for inactive or missing place', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/place-404/availability?date=2026-06-15',
        params: { id: 'place-404' },
      }),
    );

    expect(response.status).toBe(404);
  });

  it('returns closed day with no slots', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'place-1', name: 'Test Mekan' }] })
      .mockResolvedValueOnce({ rows: [{ is_closed: true, open_time: '10:00', close_time: '22:00' }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/place-1/availability?date=2026-06-15',
        params: { id: 'place-1' },
      }),
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.available).toBe(false);
    expect(body?.data?.reason).toBe('Kapalı');
  });

  it('filters reserved times out of generated slots', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'place-1', name: 'Test Mekan' }] })
      .mockResolvedValueOnce({ rows: [{ is_closed: false, open_time: '10:00', close_time: '12:00' }] })
      .mockResolvedValueOnce({ rows: [{ reservation_time: '10:30:00', party_size: 2 }] });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/place-1/availability?date=2026-06-15',
        params: { id: 'place-1' },
      }),
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.available).toBe(true);
    expect(body?.data?.slots).toEqual(['10:00', '11:00']);
    expect(body?.data?.slots).not.toContain('10:30');
  });
});
