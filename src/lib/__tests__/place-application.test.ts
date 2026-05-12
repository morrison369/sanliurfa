import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, transactionMock, clientQueryMock, hashMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  transactionMock: vi.fn(),
  clientQueryMock: vi.fn(),
  hashMock: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: hashMock,
  },
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  transaction: transactionMock,
}));

import { submitPlaceApplication } from '../places/place-application';

describe('submitPlaceApplication', () => {
  beforeEach(() => {
    queryMock.mockReset();
    transactionMock.mockReset();
    clientQueryMock.mockReset();
    hashMock.mockReset();

    hashMock.mockResolvedValue('hashed-password');
    queryMock.mockResolvedValue({ rows: [], rowCount: 0, command: 'SELECT' });
    transactionMock.mockImplementation(async (callback) => callback({ query: clientQueryMock }));

    clientQueryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id FROM users')) {
        return { rows: [], rowCount: 0, command: 'SELECT' };
      }
      if (sql.includes('INSERT INTO users')) {
        return { rows: [{ id: 'user-1' }], rowCount: 1, command: 'INSERT' };
      }
      if (sql.includes('INSERT INTO places')) {
        return { rows: [{ id: 'place-1', slug: 'smoke-test-mekan' }], rowCount: 1, command: 'INSERT' };
      }
      if (sql.includes('INSERT INTO support_tickets')) {
        return { rows: [], rowCount: 1, command: 'INSERT' };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });
  });

  it('writes description and short_description when shortDescription is provided', async () => {
    await submitPlaceApplication({
      name: 'Smoke Test Mekan',
      category: 'kafe',
      address: 'Test Mahallesi No:1',
      phone: '05000000000',
      shortDescription: 'Kisa aciklama',
      ownerName: 'Smoke Tester',
      ownerEmail: 'smoke@sanliurfa.com',
    });

    const placeInsert = clientQueryMock.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO places'),
    );

    expect(placeInsert).toBeTruthy();
    expect(placeInsert?.[1]?.[4]).toBe('Kisa aciklama');
    expect(placeInsert?.[1]?.[5]).toBe('Kisa aciklama');
  });

  it('uses a non-null description fallback when shortDescription is missing', async () => {
    await submitPlaceApplication({
      name: 'Smoke Test Mekan',
      category: 'kafe',
      address: 'Test Mahallesi No:1',
      phone: '05000000000',
      ownerName: 'Smoke Tester',
      ownerEmail: 'smoke@sanliurfa.com',
    });

    const placeInsert = clientQueryMock.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO places'),
    );

    expect(placeInsert).toBeTruthy();
    expect(placeInsert?.[1]?.[4]).toContain('Smoke Test Mekan');
    expect(placeInsert?.[1]?.[5]).toBeNull();
  });
});
