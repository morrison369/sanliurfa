import ExcelJS from 'exceljs';

/**
 * Excel export is write-only. We do not parse untrusted workbook input here.
 */
export async function generateExcelBuffer(headers: string[], rows: any[][], sheetName: string = 'Report'): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31) || 'Report');

  worksheet.addRow(headers);
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  const columnWidths = headers.map((header, index) => {
    const maxCellLength = rows.reduce((max, row) => {
      const value = row[index] ?? '';
      return Math.max(max, String(value).length);
    }, String(header).length);

    return { width: Math.min(Math.max(maxCellLength + 2, 12), 40) };
  });

  worksheet.columns = worksheet.columns.map((column, index) => ({
    ...column,
    width: columnWidths[index]?.width ?? 16
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
