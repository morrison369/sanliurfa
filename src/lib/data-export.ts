import { query } from './postgres';
import { generateCSV } from './csv-excel';

export async function exportData(
  type: string,
  format: 'csv' | 'json' = 'csv',
  filters: Record<string, any> = {}
): Promise<{ filename: string; data: string; recordCount: number }> {
  const table = type === 'users' ? 'users' : type === 'reviews' ? 'reviews' : 'places';
  const rows = await query(`SELECT * FROM ${table} LIMIT 1000`);
  const recordCount = rows.rowCount ?? rows.rows.length;
  const data = format === 'json' ? JSON.stringify(rows.rows) : generateCSV(rows.rows as any[]);
  const ext = format === 'json' ? 'json' : 'csv';
  const filename = `${table}-export.${ext}`;
  void filters;
  return { filename, data, recordCount };
}
