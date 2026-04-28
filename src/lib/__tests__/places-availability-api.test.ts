import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiContext, expectApiErrorCode, parseJson } from './helpers/api-test-helpers';

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

describe('places availability api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when date is missing/invalid', async () => {
    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/availability',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expectApiErrorCode(body, 'VALIDATION_ERROR');
  });

  it('returns 404 when place not found', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/availability?date=2026-04-18',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expectApiErrorCode(body, 'NOT_FOUND');
  });

  it('returns availability slots on success', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: '1', name: 'Mekan' }] })
      .mockResolvedValueOnce({ rows: [{ open_time: '10:00', close_time: '12:00', is_closed: false }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await GET(
      createApiContext({
        url: 'http://localhost/api/places/1/availability?date=2026-04-18',
        params: { id: '1' },
      })
    );
    const body = await parseJson(response);

    expect(response.status).toBe(200);
    expect(body?.data?.available).toBe(true);
    expect(Array.isArray(body?.data?.slots)).toBe(true);
  });
});
