import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
  queryOne: vi.fn(),
}));

import {
  getCityContentDraftSummary,
  listCityContentDrafts,
} from '../city-content-agents';

describe('city-content-agents draft listing', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
  });

  it('status, draftType, limit ve offset filtrelerini SQL parametreleriyle uygular', async () => {
    queryMock.mockResolvedValue({ rows: [{ id: 'draft-1' }] });

    const rows = await listCityContentDrafts({
      status: 'pending',
      draftType: 'place-discovery-draft',
      limit: 250,
      offset: 25,
    });

    const selectCall = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('SELECT * FROM city_content_drafts'),
    );
    expect(rows).toEqual([{ id: 'draft-1' }]);
    expect(selectCall?.[0]).toContain('status = $1');
    expect(selectCall?.[0]).toContain('draft_type = $2');
    expect(selectCall?.[0]).toContain('LIMIT $3 OFFSET $4');
    expect(selectCall?.[1]).toEqual(['pending', 'place-discovery-draft', 250, 25]);
  });

  it('limit değerini 1-500 aralığında sınırlar', async () => {
    await listCityContentDrafts({ limit: 9999, offset: -20 });

    const selectCall = queryMock.mock.calls.find(([sql]) =>
      String(sql).includes('SELECT * FROM city_content_drafts'),
    );
    expect(selectCall?.[1]).toEqual([500, 0]);
  });

  it('draft summary için status ve type sayımlarını toplar', async () => {
    queryMock.mockImplementation((sql) => {
      const text = String(sql);
      if (text.includes('GROUP BY status')) {
        return Promise.resolve({
        rows: [
          { status: 'approved', count: 2 },
          { status: 'pending', count: 447 },
        ],
        });
      }
      if (text.includes('GROUP BY draft_type')) {
        return Promise.resolve({
        rows: [
          { draft_type: 'place-discovery-draft', count: 447 },
          { draft_type: 'seo-override-draft', count: 2 },
        ],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const summary = await getCityContentDraftSummary();

    expect(summary.total).toBe(449);
    expect(summary.byStatus.pending).toBe(447);
    expect(summary.byStatus.approved).toBe(2);
    expect(summary.byType['place-discovery-draft']).toBe(447);
  });
});
