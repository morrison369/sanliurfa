/**
 * Data Export/Import System
 * JSON, CSV, Excel support
 */

import { query } from '../postgres';
import { logger } from '../logging';

export type ExportFormat = 'json' | 'csv' | 'xlsx';

export interface ExportOptions {
  table: string;
  format: ExportFormat;
  where?: string;
  params?: any[];
  limit?: number;
  offset?: number;
}

export interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
}

/**
 * Export data to format
 */
const ALLOWED_EXPORT_TABLES = new Set(['places', 'users', 'reviews', 'events', 'categories', 'blog_posts', 'collections']);

export async function exportData(options: ExportOptions): Promise<{
  data: string | Buffer;
  filename: string;
  contentType: string;
}> {
  if (!ALLOWED_EXPORT_TABLES.has(options.table)) {
    throw new Error(`Export not allowed for table: ${options.table}`);
  }
  // Build query
  let sql = `SELECT * FROM ${options.table}`;
  
  if (options.where) {
    sql += ` WHERE ${options.where}`;
  }
  
  if (options.limit) {
    sql += ` LIMIT ${options.limit}`;
  }
  
  if (options.offset) {
    sql += ` OFFSET ${options.offset}`;
  }

  const result = await query(sql, options.params);

  switch (options.format) {
    case 'json':
      return {
        data: JSON.stringify(result.rows, null, 2),
        filename: `${options.table}_export_${Date.now()}.json`,
        contentType: 'application/json',
      };
    
    case 'csv':
      return {
        data: convertToCSV(result.rows),
        filename: `${options.table}_export_${Date.now()}.csv`,
        contentType: 'text/csv',
      };
    
    case 'xlsx':
      return {
        data: await convertToExcel(result.rows, options.table),
        filename: `${options.table}_export_${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    
    default:
      throw new Error('Unsupported format');
  }
}

/**
 * Convert to CSV
 */
function convertToCSV(rows: any[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const lines: string[] = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Convert to Excel
 */
async function convertToExcel(rows: any[], sheetName: string): Promise<Buffer> {
  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const safeName = String(sheetName || 'Export').slice(0, 31);
    const worksheet = workbook.addWorksheet(safeName || 'Export');

    if (rows.length === 0) {
      const buf = await workbook.xlsx.writeBuffer();
      return Buffer.from(buf);
    }

    const headers = Object.keys(rows[0]);
    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(40, Math.max(12, header.length + 2)),
    }));

    for (const row of rows) {
      worksheet.addRow(row);
    }
    worksheet.getRow(1).font = { bold: true };

    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  } catch (error) {
    logger.error('Excel export error:', error);
    // Fallback to CSV
    return Buffer.from(convertToCSV(rows));
  }
}

/**
 * Import data from JSON
 */
export async function importFromJSON(
  table: string,
  data: any[],
  options: {
    upsert?: boolean;
    uniqueKey?: string;
  } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    inserted: 0,
    updated: 0,
    errors: [],
  };

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');

      if (options.upsert && options.uniqueKey) {
        // Upsert logic
        const updateSet = columns
          .filter(col => col !== options.uniqueKey)
          .map((col, _idx) => `${col} = EXCLUDED.${col}`)
          .join(', ');

        await query(
          `INSERT INTO ${table} (${columns.join(', ')})
           VALUES (${placeholders})
           ON CONFLICT (${options.uniqueKey}) DO UPDATE SET ${updateSet}`,
          values
        );
        result.updated++;
      } else {
        // Insert only
        await query(
          `INSERT INTO ${table} (${columns.join(', ')})
           VALUES (${placeholders})`,
          values
        );
        result.inserted++;
      }
    } catch (error) {
      result.errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Import data from CSV
 */
export async function importFromCSV(
  table: string,
  csvContent: string,
  options: {
    upsert?: boolean;
    uniqueKey?: string;
  } = {}
): Promise<ImportResult> {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    return {
      success: false,
      inserted: 0,
      updated: 0,
      errors: [{ row: 0, message: 'CSV is empty or has no data rows' }],
    };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || null;
    });
    data.push(row);
  }

  return importFromJSON(table, data, options);
}

/**
 * Parse CSV line
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Get table schema for export template
 */
export async function getTableSchema(table: string): Promise<Array<{
  column: string;
  type: string;
  nullable: boolean;
  default?: string;
}>> {
  const result = await query(
    `SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
     FROM information_schema.columns
     WHERE table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );

  return result.rows.map(row => ({
    column: row.column_name,
    type: row.data_type,
    nullable: row.is_nullable === 'YES',
    default: row.column_default,
  }));
}

/**
 * Export all places
 */
export async function exportPlaces(format: ExportFormat): Promise<{
  data: string | Buffer;
  filename: string;
  contentType: string;
}> {
  return exportData({
    table: 'places',
    format,
  });
}

/**
 * Export all users (admin only)
 */
export async function exportUsers(format: ExportFormat): Promise<{
  data: string | Buffer;
  filename: string;
  contentType: string;
}> {
  return exportData({
    table: 'users',
    format,
    where: "status = 'active'",
  });
}

/**
 * Export reviews
 */
export async function exportReviews(format: ExportFormat): Promise<{
  data: string | Buffer;
  filename: string;
  contentType: string;
}> {
  return exportData({
    table: 'reviews',
    format,
    where: 'status = $1',
    params: ['active'],
  });
}
