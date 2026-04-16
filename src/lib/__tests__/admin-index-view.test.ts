import { describe, expect, it } from 'vitest';
import {
  buildAdminIndexRiskCardViews,
  buildAdminIndexToolCardViews,
} from '../admin-index-view';
import type { AdminIndexRiskCard, AdminIndexToolCard } from '../admin-index';

describe('admin index view smoke', () => {
  it('builds risk card render model with visual classes and resolved action text', () => {
    const cards: AdminIndexRiskCard[] = [
      {
        href: '/admin/dashboard',
        title: 'Release Gate',
        status: 'blocked',
        summary: 'failed',
        detail: 'first-step',
        action: {
          healthy: 'izle',
          degraded: 'incele',
          blocked: 'hemen düzelt',
        },
        generatedAt: '2026-04-16T10:20:00.000Z',
        icon: (() => null) as any,
      },
    ];

    const views = buildAdminIndexRiskCardViews(cards);

    expect(views[0]).toMatchObject({
      href: '/admin/dashboard',
      title: 'Release Gate',
      status: 'blocked',
      actionText: 'hemen düzelt',
    });
    expect(views[0]?.badgeClassName).toContain('text-red-700');
    expect(views[0]?.cardClassName).toContain('border-red-200');
    expect(views[0]?.generatedAtLabel).toContain('2026');
  });

  it('keeps tool cards stable for page rendering', () => {
    const cards: AdminIndexToolCard[] = [
      {
        href: '/admin/runtime-monitor',
        title: 'Runtime Monitör',
        description: 'Health ve performance',
        meta: 'Öncelik: Kritik izleme',
        icon: (() => null) as any,
      },
    ];

    const views = buildAdminIndexToolCardViews(cards);

    expect(views).toEqual(cards);
  });
});
