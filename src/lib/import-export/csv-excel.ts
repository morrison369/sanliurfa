/**
 * CSV/Excel import/export service
 */

export type ExportFormat = 'csv' | 'xlsx' | 'json';

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: Array<{ row: number; message: string }>;
  duration: number;
}

export function exportToCSV(
  data: Record<string, any>[],
  options?: { columns?: string[]; includeHeaders?: boolean; delimiter?: string }
): string {
  if (data.length === 0) return '';
  
  const delimiter = options?.delimiter || ',';
  const includeHeaders = options?.includeHeaders ?? true;
  const columns = options?.columns || Object.keys(data[0]);
  
  let csv = '';
  
  if (includeHeaders) {
    csv += columns.join(delimiter) + '\n';
  }
  
  for (const row of data) {
    const values = columns.map(col => {
      const value = row[col];
      if (typeof value === 'string' && /[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    });
    csv += values.join(delimiter) + '\n';
  }
  
  return csv;
}

export function parseCSV(
  csvString: string,
  options?: { delimiter?: string; hasHeaders?: boolean; skipEmptyLines?: boolean }
): Record<string, any>[] {
  const delimiter = options?.delimiter || ',';
  const hasHeaders = options?.hasHeaders ?? true;
  const skipEmptyLines = options?.skipEmptyLines ?? true;
  
  const lines = csvString.split('\n').filter(line => {
    return skipEmptyLines ? line.trim().length > 0 : true;
  });
  
  if (lines.length === 0) return [];
  
  let headers: string[] = [];
  let dataStartIndex = 0;
  
  if (hasHeaders) {
    headers = parseCSVLine(lines[0], delimiter);
    dataStartIndex = 1;
  } else {
    headers = parseCSVLine(lines[0], delimiter).map((_, i) => `column_${i}`);
  }
  
  const result: Record<string, any>[] = [];
  
  for (let i = dataStartIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    result.push(row);
  }
  
  return result;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  values.push(current.trim());
  return values;
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/csv'
): void {
  if (typeof window === 'undefined') return;
  
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateCSVTemplate(type: 'places' | 'users' | 'events'): string {
  switch (type) {
    case 'places':
      return 'name,category,description,address,phone,lat,lon,tags\n' +
             'Örnek Mekan,restaurant,Harika bir restoran,Örnek Adres,+901234567890,37.1591,38.7969,"yemek,restoran"';
    case 'users':
      return 'name,email,role\nAhmet Yılmaz,ahmet@example.com,user';
    case 'events':
      return 'title,description,start_date,end_date,location\nŞanlıurfa Festivali,Festival,2026-06-01,2026-06-07,Şanlıurfa';
    default:
      return '';
  }
}

