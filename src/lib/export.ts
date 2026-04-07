/**
 * Data Export Utilities
 * - CSV and JSON export functions
 * - Data sanitization for exports
 */

export function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csv = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  return csv;
}

export function convertToJSON(data: any[]): string {
  return JSON.stringify(data, null, 2);
}

export function getContentType(format: string): string {
  return format === 'csv' ? 'text/csv' : 'application/json';
}

export function getFileExtension(format: string): string {
  return format === 'csv' ? 'csv' : 'json';
}

export function getFormattedDate(): string {
  return new Date().toISOString().split('T')[0];
}
