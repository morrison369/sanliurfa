/**
 * Reporting helpers for /admin/reports — count-based snapshots over a date range.
 *
 * Each generator returns a flat object of metric → number/string so the same shape can be
 * serialized to CSV (one row per metric) or JSON. Queries are deliberately simple — these
 * power the admin dashboard, not high-cardinality analytics.
 */

import { queryOne } from '../postgres';

async function safeCount(sql: string, params: unknown[] = []): Promise<number> {
  try {
    const row = await queryOne<{ c: string | number }>(sql, params);
    return Number(row?.c ?? 0);
  } catch {
    return 0;
  }
}

export interface UserReport {
  period_start: string;
  period_end: string;
  new_users: number;
  active_users: number;
  banned_users: number;
}

export async function generateUserReport(startDate: string, endDate: string): Promise<UserReport> {
  return {
    period_start: startDate,
    period_end: endDate,
    new_users: await safeCount(
      'SELECT COUNT(*)::int AS c FROM users WHERE created_at BETWEEN $1 AND $2',
      [startDate, endDate],
    ),
    active_users: await safeCount(
      "SELECT COUNT(*)::int AS c FROM users WHERE status = 'active'",
    ),
    banned_users: await safeCount(
      "SELECT COUNT(*)::int AS c FROM users WHERE status = 'banned'",
    ),
  };
}

export interface PlacesReport {
  period_start: string;
  period_end: string;
  new_places: number;
  active_places: number;
  pending_places: number;
}

export async function generatePlacesReport(startDate: string, endDate: string): Promise<PlacesReport> {
  return {
    period_start: startDate,
    period_end: endDate,
    new_places: await safeCount(
      'SELECT COUNT(*)::int AS c FROM places WHERE created_at BETWEEN $1 AND $2',
      [startDate, endDate],
    ),
    active_places: await safeCount(
      "SELECT COUNT(*)::int AS c FROM places WHERE status = 'active'",
    ),
    pending_places: await safeCount(
      "SELECT COUNT(*)::int AS c FROM places WHERE status = 'pending'",
    ),
  };
}

export interface ReviewsReport {
  period_start: string;
  period_end: string;
  new_reviews: number;
  total_reviews: number;
}

export async function generateReviewsReport(startDate: string, endDate: string): Promise<ReviewsReport> {
  return {
    period_start: startDate,
    period_end: endDate,
    new_reviews: await safeCount(
      'SELECT COUNT(*)::int AS c FROM reviews WHERE created_at BETWEEN $1 AND $2',
      [startDate, endDate],
    ),
    total_reviews: await safeCount('SELECT COUNT(*)::int AS c FROM reviews'),
  };
}

export interface RevenueReport {
  period_start: string;
  period_end: string;
  payment_count: number;
  gross_revenue: number;
}

export async function generateRevenueReport(startDate: string, endDate: string): Promise<RevenueReport> {
  let grossRevenue = 0;
  try {
    const row = await queryOne<{ s: string | number | null }>(
      "SELECT COALESCE(SUM(amount), 0)::float AS s FROM payments WHERE status = 'completed' AND created_at BETWEEN $1 AND $2",
      [startDate, endDate],
    );
    grossRevenue = Number(row?.s ?? 0);
  } catch { /* table may not exist in some envs */ }

  return {
    period_start: startDate,
    period_end: endDate,
    payment_count: await safeCount(
      "SELECT COUNT(*)::int AS c FROM payments WHERE status = 'completed' AND created_at BETWEEN $1 AND $2",
      [startDate, endDate],
    ),
    gross_revenue: grossRevenue,
  };
}

export interface EngagementReport {
  period_start: string;
  period_end: string;
  reviews_added: number;
  follows_added: number;
  messages_sent: number;
}

export async function generateEngagementReport(startDate: string, endDate: string): Promise<EngagementReport> {
  return {
    period_start: startDate,
    period_end: endDate,
    reviews_added: await safeCount(
      'SELECT COUNT(*)::int AS c FROM reviews WHERE created_at BETWEEN $1 AND $2',
      [startDate, endDate],
    ),
    follows_added: await safeCount(
      'SELECT COUNT(*)::int AS c FROM user_follows WHERE created_at BETWEEN $1 AND $2',
      [startDate, endDate],
    ),
    messages_sent: await safeCount(
      'SELECT COUNT(*)::int AS c FROM messages WHERE created_at BETWEEN $1 AND $2',
      [startDate, endDate],
    ),
  };
}

export interface SummaryStats {
  total_users: number;
  total_places: number;
  total_reviews: number;
  total_payments: number;
}

export async function getSummaryStats(): Promise<SummaryStats> {
  return {
    total_users: await safeCount('SELECT COUNT(*)::int AS c FROM users'),
    total_places: await safeCount('SELECT COUNT(*)::int AS c FROM places'),
    total_reviews: await safeCount('SELECT COUNT(*)::int AS c FROM reviews'),
    total_payments: await safeCount("SELECT COUNT(*)::int AS c FROM payments WHERE status = 'completed'"),
  };
}

export function reportToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map(h => escape(row[h])).join(','));
  return lines.join('\n');
}

export function reportToJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
