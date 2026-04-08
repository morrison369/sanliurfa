/**
 * Report Engine
 * Execute reports and generate exports in multiple formats
 */

import { query, queryMany, queryOne } from './postgres';
import { logReportExecution } from './business-analytics';
import { logger } from './logging';
import * as XLSX from 'xlsx';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  limit?: number;
  segment?: string;
}

interface ExportResult {
  buffer: Buffer | string;
  contentType: string;
  filename: string;
  rowCount: number;
}

/**
 * CSV format generator with proper escaping
 */
function toCSV(headers: string[], rows: any[][]): string {
  const escapedHeaders = headers.map(h => {
    const str = String(h || '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  });

  const escapedRows = rows.map(row =>
    row.map(cell => {
      const str = String(cell ?? '');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );

  return [escapedHeaders.join(','), ...escapedRows].join('\n');
}

/**
 * JSON format generator
 */
function toJSON(headers: string[], rows: any[][]): string {
  const data = rows.map(row => {
    const obj: any = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? null;
    });
    return obj;
  });
  return JSON.stringify(data, null, 2);
}

/**
 * Excel format generator using XLSX
 */
function toExcel(headers: string[], rows: any[][], sheetName: string = 'Report'): Buffer {
  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}

/**
 * Collect business metrics data
 */
async function collectBusinessMetricsData(filters: ReportFilters): Promise<{ headers: string[]; rows: any[][] }> {
  try {
    const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate || new Date().toISOString().split('T')[0];

    const metrics = await queryMany(
      `SELECT metric_date, revenue, user_count, active_users, new_users,
              engagement_rate, churn_rate, retention_rate, conversion_rate,
              avg_session_duration, page_views, bounce_rate
       FROM business_metrics
       WHERE metric_date BETWEEN $1 AND $2
       ORDER BY metric_date DESC`,
      [startDate, endDate]
    );

    const headers = ['Date', 'Revenue', 'Total Users', 'Active Users', 'New Users',
      'Engagement %', 'Churn %', 'Retention %', 'Conversion %', 'Avg Session (s)', 'Page Views', 'Bounce %'];

    const rows = metrics.map((m: any) => [
      m.metric_date,
      m.revenue || 0,
      m.user_count || 0,
      m.active_users || 0,
      m.new_users || 0,
      (m.engagement_rate || 0).toFixed(2),
      (m.churn_rate || 0).toFixed(2),
      (m.retention_rate || 0).toFixed(2),
      (m.conversion_rate || 0).toFixed(2),
      m.avg_session_duration || 0,
      m.page_views || 0,
      (m.bounce_rate || 0).toFixed(2)
    ]);

    return { headers, rows };
  } catch (error) {
    logger.error('Failed to collect business metrics data', error instanceof Error ? error : new Error(String(error)));
    return { headers: [], rows: [] };
  }
}

/**
 * Collect KPI data
 */
async function collectKPIData(filters: ReportFilters): Promise<{ headers: string[]; rows: any[][] }> {
  try {
    const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = filters.endDate || new Date().toISOString().split('T')[0];

    const kpiData = await queryMany(
      `SELECT kd.key, kd.name, kd.unit, kd.category, kv.period_date, kv.value, kv.target_value
       FROM kpi_definitions kd
       LEFT JOIN kpi_values kv ON kd.id = kv.kpi_id
       WHERE kv.period_date BETWEEN $1 AND $2 OR kv.period_date IS NULL
       ORDER BY kd.key, kv.period_date DESC`,
      [startDate, endDate]
    );

    const headers = ['KPI Key', 'KPI Name', 'Category', 'Date', 'Value', 'Target', 'Unit'];

    const rows = kpiData.map((k: any) => [
      k.key,
      k.name,
      k.category || 'General',
      k.period_date || 'N/A',
      k.value || 0,
      k.target_value || 'N/A',
      k.unit || ''
    ]);

    return { headers, rows };
  } catch (error) {
    logger.error('Failed to collect KPI data', error instanceof Error ? error : new Error(String(error)));
    return { headers: [], rows: [] };
  }
}

/**
 * Collect user data (non-sensitive)
 */
async function collectUserData(filters: ReportFilters): Promise<{ headers: string[]; rows: any[][] }> {
  try {
    const limit = filters.limit || 1000;
    const users = await queryMany(
      `SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    const headers = ['User ID', 'Email', 'Full Name', 'Role', 'Created Date'];

    const rows = users.map((u: any) => [
      u.id,
      u.email,
      u.full_name || 'N/A',
      u.role || 'user',
      u.created_at
    ]);

    return { headers, rows };
  } catch (error) {
    logger.error('Failed to collect user data', error instanceof Error ? error : new Error(String(error)));
    return { headers: [], rows: [] };
  }
}

/**
 * Collect places data
 */
async function collectPlacesData(filters: ReportFilters): Promise<{ headers: string[]; rows: any[][] }> {
  try {
    const limit = filters.limit || 1000;
    const places = await queryMany(
      `SELECT id, title, category, rating, visit_count, follower_count, created_at
       FROM places ORDER BY visit_count DESC LIMIT $1`,
      [limit]
    );

    const headers = ['Place ID', 'Title', 'Category', 'Rating', 'Visits', 'Followers', 'Created'];

    const rows = places.map((p: any) => [
      p.id,
      p.title,
      p.category || 'Uncategorized',
      (p.rating || 0).toFixed(1),
      p.visit_count || 0,
      p.follower_count || 0,
      p.created_at
    ]);

    return { headers, rows };
  } catch (error) {
    logger.error('Failed to collect places data', error instanceof Error ? error : new Error(String(error)));
    return { headers: [], rows: [] };
  }
}

/**
 * Collect reviews data
 */
async function collectReviewsData(filters: ReportFilters): Promise<{ headers: string[]; rows: any[][] }> {
  try {
    const limit = filters.limit || 1000;
    const reviews = await queryMany(
      `SELECT r.id, r.place_id, p.title as place_title, r.rating, r.comment, r.created_at
       FROM reviews r
       LEFT JOIN places p ON r.place_id = p.id
       ORDER BY r.created_at DESC LIMIT $1`,
      [limit]
    );

    const headers = ['Review ID', 'Place ID', 'Place Title', 'Rating', 'Comment', 'Created'];

    const rows = reviews.map((r: any) => [
      r.id,
      r.place_id,
      r.place_title || 'N/A',
      r.rating || 0,
      r.comment || '',
      r.created_at
    ]);

    return { headers, rows };
  } catch (error) {
    logger.error('Failed to collect reviews data', error instanceof Error ? error : new Error(String(error)));
    return { headers: [], rows: [] };
  }
}

/**
 * Execute report and return formatted data
 */
export async function executeReport(
  reportId: string,
  format: 'csv' | 'json' | 'excel' = 'csv'
): Promise<ExportResult> {
  const startTime = Date.now();

  try {
    // Fetch report config
    const report = await queryOne(
      `SELECT id, name, report_type, filters FROM reports WHERE id = $1`,
      [reportId]
    );

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const reportType = report.report_type || 'business_metrics';
    const filters: ReportFilters = report.filters ? JSON.parse(report.filters) : {};

    let exportData: { headers: string[]; rows: any[][] };

    // Route to correct collector
    switch (reportType) {
      case 'business_metrics':
        exportData = await collectBusinessMetricsData(filters);
        break;
      case 'kpi_report':
        exportData = await collectKPIData(filters);
        break;
      case 'users':
        exportData = await collectUserData(filters);
        break;
      case 'places':
        exportData = await collectPlacesData(filters);
        break;
      case 'reviews':
        exportData = await collectReviewsData(filters);
        break;
      default:
        exportData = await collectBusinessMetricsData(filters);
    }

    // Generate format
    let buffer: Buffer | string;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case 'json':
        buffer = toJSON(exportData.headers, exportData.rows);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
      case 'excel':
        buffer = toExcel(exportData.headers, exportData.rows, reportType);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      case 'csv':
      default:
        buffer = toCSV(exportData.headers, exportData.rows);
        contentType = 'text/csv';
        fileExtension = 'csv';
    }

    const duration = Date.now() - startTime;
    const filename = `${report.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${fileExtension}`;

    // Log execution
    await logReportExecution(reportId, 'completed', {
      duration_ms: duration,
      data_rows: exportData.rows.length,
      file_path: filename
    });

    logger.info('Report executed', { report_id: reportId, format, duration_ms: duration, rows: exportData.rows.length });

    return {
      buffer,
      contentType,
      filename,
      rowCount: exportData.rows.length
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Failed to execute report', error instanceof Error ? error : new Error(String(error)));
    await logReportExecution(reportId, 'failed', { duration_ms: duration });
    throw error;
  }
}

/**
 * Get export templates for user
 */
export async function getExportTemplates(userId: string): Promise<any[]> {
  try {
    const templates = await queryMany(
      `SELECT id, name, export_format, columns, filters, created_at
       FROM export_templates
       WHERE created_by = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return templates;
  } catch (error) {
    logger.error('Failed to get export templates', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Create export template
 */
export async function createExportTemplate(
  userId: string,
  name: string,
  exportFormat: string,
  columns: string[],
  filters?: any
): Promise<any | null> {
  try {
    const template = await queryOne(
      `INSERT INTO export_templates (name, export_format, columns, filters, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, export_format, columns, filters, created_at`,
      [name, exportFormat, JSON.stringify(columns), JSON.stringify(filters || {}), userId]
    );

    logger.info('Export template created', { template_id: template.id, user_id: userId });
    return template;
  } catch (error) {
    logger.error('Failed to create export template', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}
