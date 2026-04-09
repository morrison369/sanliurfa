import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
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

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('BusinessMetrics');
    expect(sheet).toBeDefined();
    expect(sheet?.getCell('A1').value).toBe('Date');
    expect(sheet?.getCell('B2').value).toBe(1234.56);
    expect(sheet?.getCell('C3').value).toBe(140);
  });
});
