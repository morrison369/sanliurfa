import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { generateExcelBuffer } from '../report-export';

describe('report-engine excel smoke', () => {
  it('generates a valid xlsx buffer', async () => {
    const headers = ['Date', 'Revenue', 'Users'];
    const rows = [
      ['2026-04-08', 1234.56, 120],
      ['2026-04-09', 1500.0, 140]
    ];

    const buffer = await generateExcelBuffer(headers, rows, 'BusinessMetrics');

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);

    const files = unzipSync(new Uint8Array(buffer));
    const workbookXml = strFromU8(files['xl/workbook.xml']);
    const sheetXml = strFromU8(files['xl/worksheets/sheet1.xml']);
    const sharedStringsXml = strFromU8(files['xl/sharedStrings.xml']);

    expect(workbookXml).toContain('BusinessMetrics');
    expect(sharedStringsXml).toContain('Date');
    expect(sharedStringsXml).toContain('Revenue');
    expect(sharedStringsXml).toContain('Users');
    expect(sheetXml).toContain('<v>1234.56</v>');
    expect(sheetXml).toContain('<v>140</v>');
  });
});
