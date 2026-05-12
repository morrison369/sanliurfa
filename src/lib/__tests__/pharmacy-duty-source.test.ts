import { describe, expect, it } from 'vitest';
import {
  getLatestPharmacyDutyDate,
  parseOfficialPharmacyDutyHtml,
} from '../health/pharmacy-duty-source';

const SAMPLE_HTML = `
<div data-elementor-type="loop-item" class="elementor e-loop-item">
  <div class="elementor-widget-heading">
    <h5 class="elementor-heading-title">YAŞAR ECZANESİ</h5>
  </div>
  <div class="elementor-widget-heading">
    <h5 class="elementor-heading-title">(BİRECİK)</h5>
  </div>
  <div class="elementor-widget-text-editor">MEYDAN MAHALLESİ HASTANE CADDESİ LİSE SOKAK NO:17B</div>
  <div class="elementor-widget-text-editor">4146521414</div>
  <div class="elementor-widget-text-editor"><p><strong>06.04.2026</strong></p></div>
  <a href="https://www.google.com/maps?q=37.123,38.456"></a>
</div>
<div data-elementor-type="loop-item" class="elementor e-loop-item">
  <div class="elementor-widget-heading">
    <h5 class="elementor-heading-title">MERKEZ ECZANESİ</h5>
  </div>
  <div class="elementor-widget-heading">
    <h5 class="elementor-heading-title">(HALFETİ)</h5>
  </div>
  <div class="elementor-widget-text-editor">SİYAHGÜL MAHALLESİ AYDIN GÜVEN GÜRKAN CAD.13/A</div>
  <div class="elementor-widget-text-editor">(414) 751 12 63</div>
  <div class="elementor-widget-text-editor"><p><strong>08.04.2026</strong></p></div>
  <a href="https://www.google.com/maps?q=37.229423,37.945403"></a>
</div>
`;

describe('pharmacy-duty-source parser', () => {
  it('parses name, district, address, phone, duty date and coordinates', () => {
    const entries = parseOfficialPharmacyDutyHtml(SAMPLE_HTML);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      name: 'YAŞAR ECZANESİ',
      districtLabel: 'BİRECİK',
      address: 'MEYDAN MAHALLESİ HASTANE CADDESİ LİSE SOKAK NO:17B',
      phone: '4146521414',
      dutyDate: '2026-04-06',
      latitude: 37.123,
      longitude: 38.456,
    });
    expect(entries[1]?.phone).toBe('(414) 751 12 63');
  });

  it('detects latest duty date', () => {
    const entries = parseOfficialPharmacyDutyHtml(SAMPLE_HTML);
    expect(getLatestPharmacyDutyDate(entries)).toBe('2026-04-08');
  });
});
