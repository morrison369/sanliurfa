/**
 * Unit Tests — webhook/webhook-filters.ts shouldDeliverEvent pure helper
 *
 * - 6 operator: equals + contains + greater_than + less_than + in (array) + exists
 * - boş filter → daima true
 * - filter.every() AND semantik (tüm filter geçerse deliver)
 *
 * DB-bağımlı CRUD fonksiyonları (createWebhookFilter/getWebhookFilters/deleteWebhookFilter/get|updateWebhookSettings)
 * vi.mock(pg) gerektirir; bu testte sadece pure shouldDeliverEvent ele alındı.
 */

import { describe, it, expect } from 'vitest';
import { shouldDeliverEvent, type WebhookFilter } from '../webhook/webhook-filters';

const mkFilter = (overrides: Partial<WebhookFilter>): WebhookFilter => ({
  id: 'f-1',
  webhookId: 'w-1',
  filterType: 'field',
  filterKey: 'status',
  operator: 'equals',
  filterValue: 'active',
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('shouldDeliverEvent', () => {
  it('boş filter array → daima true (no filters = deliver all)', () => {
    expect(shouldDeliverEvent({ data: { foo: 'bar' } }, [])).toBe(true);
  });

  it('equals operator — match → true', () => {
    const f = mkFilter({ operator: 'equals', filterKey: 'status', filterValue: 'active' });
    expect(shouldDeliverEvent({ data: { status: 'active' } }, [f])).toBe(true);
  });

  it('equals operator — no match → false', () => {
    const f = mkFilter({ operator: 'equals', filterKey: 'status', filterValue: 'active' });
    expect(shouldDeliverEvent({ data: { status: 'inactive' } }, [f])).toBe(false);
  });

  it('contains operator — substring match → true', () => {
    const f = mkFilter({ operator: 'contains', filterKey: 'name', filterValue: 'urfa' });
    expect(shouldDeliverEvent({ data: { name: 'sanliurfa.com' } }, [f])).toBe(true);
  });

  it('contains operator — no substring → false', () => {
    const f = mkFilter({ operator: 'contains', filterKey: 'name', filterValue: 'xyz' });
    expect(shouldDeliverEvent({ data: { name: 'sanliurfa' } }, [f])).toBe(false);
  });

  it('greater_than operator — numeric compare', () => {
    const f = mkFilter({ operator: 'greater_than', filterKey: 'amount', filterValue: 100 });
    expect(shouldDeliverEvent({ data: { amount: 200 } }, [f])).toBe(true);
    expect(shouldDeliverEvent({ data: { amount: 50 } }, [f])).toBe(false);
  });

  it('less_than operator — numeric compare', () => {
    const f = mkFilter({ operator: 'less_than', filterKey: 'amount', filterValue: 100 });
    expect(shouldDeliverEvent({ data: { amount: 50 } }, [f])).toBe(true);
    expect(shouldDeliverEvent({ data: { amount: 200 } }, [f])).toBe(false);
  });

  it('in operator — array .includes()', () => {
    const f = mkFilter({ operator: 'in', filterKey: 'category', filterValue: ['food', 'drink'] });
    expect(shouldDeliverEvent({ data: { category: 'food' } }, [f])).toBe(true);
    expect(shouldDeliverEvent({ data: { category: 'tech' } }, [f])).toBe(false);
  });

  it('in operator — value array değilse false', () => {
    const f = mkFilter({ operator: 'in', filterKey: 'x', filterValue: 'not-array' as any });
    expect(shouldDeliverEvent({ data: { x: 'whatever' } }, [f])).toBe(false);
  });

  it('exists operator — value defined → true', () => {
    const f = mkFilter({ operator: 'exists', filterKey: 'optionalField', filterValue: '' });
    expect(shouldDeliverEvent({ data: { optionalField: 'value' } }, [f])).toBe(true);
  });

  it('exists operator — undefined/null → false', () => {
    const f = mkFilter({ operator: 'exists', filterKey: 'missing', filterValue: '' });
    expect(shouldDeliverEvent({ data: {} }, [f])).toBe(false);
    expect(shouldDeliverEvent({ data: { missing: null } }, [f])).toBe(false);
  });

  it('multiple filters — AND semantic (every filter must pass)', () => {
    const f1 = mkFilter({ id: 'f-1', operator: 'equals', filterKey: 'status', filterValue: 'active' });
    const f2 = mkFilter({ id: 'f-2', operator: 'greater_than', filterKey: 'amount', filterValue: 100 });
    expect(shouldDeliverEvent({ data: { status: 'active', amount: 200 } }, [f1, f2])).toBe(true);
    expect(shouldDeliverEvent({ data: { status: 'active', amount: 50 } }, [f1, f2])).toBe(false);
  });

  it('event.data yoksa → optional chaining ile no-throw', () => {
    const f = mkFilter({ operator: 'exists', filterKey: 'x', filterValue: '' });
    expect(shouldDeliverEvent({}, [f])).toBe(false);
  });
});
