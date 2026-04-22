import writeXlsxFile, { type SheetData } from 'write-excel-file/node';

/**
 * Excel export is write-only. We do not parse untrusted workbook input here.
 */
export async function generateExcelBuffer(headers: string[], rows: any[][], sheetName: string = 'Report'): Promise<Buffer> {
  const columnWidths = headers.map((header, index) => {
    const maxCellLength = rows.reduce((max, row) => {
      const value = row[index] ?? '';
      return Math.max(max, String(value).length);
    }, String(header).length);

    return { width: Math.min(Math.max(maxCellLength + 2, 12), 40) };
  });

  const sheetData: SheetData = [
    headers.map((header) => ({
      value: header,
      type: String,
      fontWeight: 'bold'
    })),
    ...rows.map((row) => row.map((value) => value ?? null))
  ];

  const buffer = await writeXlsxFile(sheetData, {
    sheet: sheetName.slice(0, 31) || 'Report',
    columns: columnWidths,
    stickyRowsCount: 1
  }).toBuffer();
  return Buffer.from(buffer);
}
