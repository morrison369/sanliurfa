export async function parseCSV(content: string): Promise<Record<string, string>[]> {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    return row;
  });
}

export function generateCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => String(row[h] ?? '').replace(/,/g, ' ')).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}
