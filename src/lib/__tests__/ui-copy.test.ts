import { describe, expect, it } from 'vitest';

import { UI_COPY_TR } from '../ui-copy';

describe('ui-copy', () => {
  it('exposes centralized loading and empty states', () => {
    expect(UI_COPY_TR.notifications.loading).toBe('Bildirim merkezi yükleniyor...');
    expect(UI_COPY_TR.collections.empty).toContain('Henüz oluşturulmuş koleksiyon');
    expect(UI_COPY_TR.reports.download).toBe('Raporu indir');
  });

  it('uses normalized common actions', () => {
    expect(UI_COPY_TR.common.cancel).toBe('İptal et');
    expect(UI_COPY_TR.common.remove).toBe('Kaldır');
    expect(UI_COPY_TR.common.viewDetails).toBe('Ayrıntıları gör');
  });
});

