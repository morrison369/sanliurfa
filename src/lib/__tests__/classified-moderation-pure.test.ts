import { describe, expect, it } from 'vitest';

import {
  buildClassifiedDuplicateMaps,
  extractClassifiedReasonCode,
  getClassifiedRiskScore,
  getClassifiedSignalFlags,
} from '../admin/classified-moderation';

describe('classified moderation helpers', () => {
  it('detects duplicate title and phone signals', () => {
    const rows = [
      { title: 'Sahibinden araba', phone: '05000000000', description: 'Detayli aciklama', images: ['/uploads/a.webp'] },
      { title: 'Sahibinden araba', phone: '05000000000', description: 'Baska detayli aciklama', images: ['/uploads/b.webp'] },
    ];
    const maps = buildClassifiedDuplicateMaps(rows);
    const flags = getClassifiedSignalFlags(rows[0], maps);
    expect(flags.duplicateTitle).toBe(true);
    expect(flags.duplicatePhone).toBe(true);
  });

  it('computes bounded risk score', () => {
    const row = {
      title: 'aaaa satilik',
      phone: '',
      description: 'kisa',
      images: [],
      view_count: 220,
      contact_count: 0,
    };
    const maps = buildClassifiedDuplicateMaps([row]);
    const score = getClassifiedRiskScore(row, maps);
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('extracts reason code from moderation note', () => {
    expect(extractClassifiedReasonCode('[REV_MEDIA] Gorsel ekleyin')).toBe('REV_MEDIA');
    expect(extractClassifiedReasonCode('Sebep kodu yok')).toBe('');
  });
});
