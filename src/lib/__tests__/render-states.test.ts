import { describe, expect, it } from 'vitest';

import { renderEmptyState, renderErrorState, renderLoadingState, renderStatusBadge } from '../render-states';

describe('render-states', () => {
  it('renders loading state', () => {
    expect(renderLoadingState('Özel yükleme')).toContain('Özel yükleme');
  });

  it('renders empty state', () => {
    expect(renderEmptyState('Boş durum')).toContain('Boş durum');
  });

  it('renders error state', () => {
    const html = renderErrorState('Bir sorun oluştu');
    expect(html).toContain('İşlem hatası');
    expect(html).toContain('Bir sorun oluştu');
  });

  it('renders status badge', () => {
    expect(renderStatusBadge('Aktif', 'success')).toContain('Aktif');
  });
});

