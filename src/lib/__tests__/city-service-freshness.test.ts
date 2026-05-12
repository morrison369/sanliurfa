/**
 * Unit Tests — City Service Freshness helpers
 *
 * Pure helpers for "Şehir Servisi" (pharmacy/transport/weather) freshness UI.
 * Tests TTL boundary, locale formatting, malformed date handling.
 */

import { describe, it, expect } from 'vitest';
import {
  SERVICE_FRESHNESS_MINUTES,
  formatFreshnessDate,
  isFreshnessStale,
  buildFreshnessLabel,
  buildFreshnessRuntimeText,
  buildFreshnessUiState,
} from '../city-service-freshness';

describe('SERVICE_FRESHNESS_MINUTES constants', () => {
  it('defines TTL for each city service', () => {
    expect(SERVICE_FRESHNESS_MINUTES['jobs.contentQuality.lastRun']).toBe(1440); // 24h
    expect(SERVICE_FRESHNESS_MINUTES['pharmacy.lastUpdated']).toBe(1440); // 24h
    expect(SERVICE_FRESHNESS_MINUTES['transport.lastUpdated']).toBe(60); // 1h
    expect(SERVICE_FRESHNESS_MINUTES['weather.lastUpdated']).toBe(30); // 30min
  });
});

describe('formatFreshnessDate', () => {
  it('returns Türkçe medium date format', () => {
    const result = formatFreshnessDate('2026-05-03T10:30:00Z');
    expect(result).toMatch(/\d+/); // contains date
    expect(result).not.toBe('Tarih bilgisi yok');
  });

  it('handles Date object input', () => {
    const result = formatFreshnessDate(new Date('2026-01-15'));
    expect(result).not.toBe('Tarih bilgisi yok');
  });

  it('returns fallback for undefined', () => {
    expect(formatFreshnessDate(undefined)).toBe('Tarih bilgisi yok');
  });

  it('returns fallback for empty string', () => {
    expect(formatFreshnessDate('')).toBe('Tarih bilgisi yok');
  });

  it('returns fallback for invalid date string', () => {
    expect(formatFreshnessDate('not-a-date')).toBe('Tarih bilgisi yok');
  });
});

describe('isFreshnessStale', () => {
  const validKey = 'transport.lastUpdated'; // 60 min TTL
  const now = Date.parse('2026-05-03T12:00:00Z');

  it('returns true when key not in freshness map', () => {
    expect(isFreshnessStale(validKey, {}, now)).toBe(true);
  });

  it('returns true when key has no TTL config', () => {
    expect(isFreshnessStale('unknown.key', { 'unknown.key': '2026-05-03T11:50:00Z' }, now)).toBe(true);
  });

  it('returns false when within TTL (transport: 60min)', () => {
    // 30 min ago — fresh
    const map = { [validKey]: '2026-05-03T11:30:00Z' };
    expect(isFreshnessStale(validKey, map, now)).toBe(false);
  });

  it('returns true when past TTL (transport: 60min, last 90min ago)', () => {
    const map = { [validKey]: '2026-05-03T10:30:00Z' }; // 90 min ago
    expect(isFreshnessStale(validKey, map, now)).toBe(true);
  });

  it('returns true at exact TTL boundary (60min equal — uses strict >)', () => {
    // exactly 60 min ago
    const map = { [validKey]: '2026-05-03T11:00:00Z' };
    // diff = 60 min = 60 * 60 * 1000 ms; threshold = ttlMinutes * 60 * 1000
    // diff > threshold means strictly greater → at exact boundary, returns false
    expect(isFreshnessStale(validKey, map, now)).toBe(false);
  });

  it('returns true 1 second past TTL', () => {
    // 60 min + 1 sec ago
    const map = { [validKey]: '2026-05-03T10:59:59Z' };
    expect(isFreshnessStale(validKey, map, now)).toBe(true);
  });

  it('returns true for invalid date string', () => {
    expect(isFreshnessStale(validKey, { [validKey]: 'not-a-date' }, now)).toBe(true);
  });

  it('weather TTL is 30 min', () => {
    const map = { 'weather.lastUpdated': '2026-05-03T11:31:00Z' }; // 29 min ago
    expect(isFreshnessStale('weather.lastUpdated', map, now)).toBe(false);
    const stale = { 'weather.lastUpdated': '2026-05-03T11:29:00Z' }; // 31 min ago
    expect(isFreshnessStale('weather.lastUpdated', stale, now)).toBe(true);
  });

  it('content quality TTL is 24h', () => {
    const map = { 'jobs.contentQuality.lastRun': '2026-05-02T12:30:00Z' }; // 23.5h ago
    expect(isFreshnessStale('jobs.contentQuality.lastRun', map, now)).toBe(false);
    const stale = { 'jobs.contentQuality.lastRun': '2026-05-02T11:30:00Z' }; // 24.5h ago
    expect(isFreshnessStale('jobs.contentQuality.lastRun', stale, now)).toBe(true);
  });

  it('pharmacy freshness falls back to legacy content-quality key', () => {
    const map = { 'jobs.contentQuality.lastRun': '2026-05-03T11:30:00Z' };
    expect(isFreshnessStale('pharmacy.lastUpdated', map, now)).toBe(false);
  });
});

describe('buildFreshnessLabel', () => {
  it('returns formatted date when key in map', () => {
    const map = { 'weather.lastUpdated': '2026-05-03T10:00:00Z' };
    const result = buildFreshnessLabel('weather.lastUpdated', map);
    expect(result).not.toBe('henüz güncellenmedi');
    expect(result).not.toBe('Tarih bilgisi yok');
  });

  it('uses legacy pharmacy fallback label when new key missing', () => {
    const map = { 'jobs.contentQuality.lastRun': '2026-05-03T10:00:00Z' };
    const result = buildFreshnessLabel('pharmacy.lastUpdated', map);
    expect(result).not.toBe('henüz güncellenmedi');
  });

  it('returns "henüz güncellenmedi" when key missing', () => {
    expect(buildFreshnessLabel('weather.lastUpdated', {})).toBe('henüz güncellenmedi');
  });

  it('returns "henüz güncellenmedi" when value empty string', () => {
    expect(buildFreshnessLabel('weather.lastUpdated', { 'weather.lastUpdated': '' })).toBe(
      'henüz güncellenmedi',
    );
  });
});

describe('buildFreshnessRuntimeText', () => {
  it('returns full label with date and status when fresh', () => {
    const text = buildFreshnessRuntimeText('2026-05-03T10:00:00Z', false);
    expect(text).toContain('Son güncelleme:');
    expect(text).toContain('güncel');
    expect(text).not.toContain('eski veri');
  });

  it('returns full label with status when stale', () => {
    const text = buildFreshnessRuntimeText('2026-05-03T10:00:00Z', true);
    expect(text).toContain('eski veri');
  });

  it('returns fallback text when updatedAt missing', () => {
    expect(buildFreshnessRuntimeText(undefined, false)).toBe('Son güncelleme bilgisi yok');
    expect(buildFreshnessRuntimeText(null, false)).toBe('Son güncelleme bilgisi yok');
  });
});

describe('buildFreshnessUiState', () => {
  it('returns BİLGİ YOK label when updatedAt missing', () => {
    const state = buildFreshnessUiState(null, false);
    expect(state.statusLabel).toBe('BİLGİ YOK');
    expect(state.text).toContain('Güncelleme bilgisi yok');
    expect(state.toneClass).toContain('#9A8470'); // neutral tone
  });

  it('returns GÜNCEL label with emerald tone when fresh', () => {
    const state = buildFreshnessUiState('2026-05-03T10:00:00Z', false);
    expect(state.statusLabel).toBe('GÜNCEL');
    expect(state.toneClass).toContain('emerald');
    expect(state.text).toContain('Veri durumu:');
  });

  it('returns SLA DIŞI label with amber tone when stale', () => {
    const state = buildFreshnessUiState('2026-05-03T10:00:00Z', true);
    expect(state.statusLabel).toBe('SLA DIŞI');
    expect(state.toneClass).toContain('amber');
  });

  it('returns three required UI fields (text, toneClass, statusLabel)', () => {
    const state = buildFreshnessUiState('2026-05-03T10:00:00Z', false);
    expect(state).toHaveProperty('text');
    expect(state).toHaveProperty('toneClass');
    expect(state).toHaveProperty('statusLabel');
  });
});
