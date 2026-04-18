import { describe, expect, it } from 'vitest';

import { renderVendorDashboard } from '../vendor-dashboard';

describe('vendor dashboard helpers', () => {
  it('renders overview tab by default', () => {
    const html = renderVendorDashboard({ activeTab: 'overview' });
    expect(html).toContain('İşletme paneli');
    expect(html).toContain('Toplam görüntüleme');
    expect(html).toContain('Genel bakış');
    expect(html).toContain('Hızlı aksiyonlar');
  });

  it('renders reviews tab state', () => {
    const html = renderVendorDashboard({ activeTab: 'reviews' });
    expect(html).toContain('Muhteşem hizmet!');
    expect(html).toContain('Yorum yönetimi');
    expect(html).toContain('Tüm yorumları aç');
  });
});
