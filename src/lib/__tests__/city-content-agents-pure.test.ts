/**
 * Unit Tests — city-content-agents.ts pure helpers + constants
 *
 * - CITY_CONTENT_AGENTS (6 agent constant + autoPublish: false invariant)
 * - isCityContentAgentKey (type guard)
 * - slugifyTr (Türkçe → ASCII + non-alphanumeric → hyphen + trim leading/trailing hyphens)
 * - CityContentAgentError (extends Error + status + code)
 *
 * NOT: ensureCityContentAgentTables, listCity*, runCityContentAgent, approve/reject DB-bağımlı.
 */

import { describe, it, expect } from 'vitest';
import {
  CITY_CONTENT_AGENTS,
  isCityContentAgentKey,
  slugifyTr,
  CityContentAgentError,
} from '../city-content-agents';

describe('CITY_CONTENT_AGENTS constant', () => {
  it('6 ajan tanımlı', () => {
    expect(CITY_CONTENT_AGENTS).toHaveLength(6);
  });

  it('tüm ajan keys unique', () => {
    const keys = CITY_CONTENT_AGENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('autoPublish: false (HARD INVARIANT — admin onayı zorunlu)', () => {
    expect(CITY_CONTENT_AGENTS.every((a) => a.autoPublish === false)).toBe(true);
  });

  it('expected keys (city-service / culture-event / place / recipe / image / seo)', () => {
    const keys = CITY_CONTENT_AGENTS.map((a) => a.key);
    expect(keys).toContain('city-service-agent');
    expect(keys).toContain('culture-event-agent');
    expect(keys).toContain('place-enrichment-agent');
    expect(keys).toContain('recipe-content-agent');
    expect(keys).toContain('image-import-agent');
    expect(keys).toContain('seo-geo-agent');
  });
});

describe('isCityContentAgentKey', () => {
  it('geçerli key → true', () => {
    expect(isCityContentAgentKey('city-service-agent')).toBe(true);
    expect(isCityContentAgentKey('seo-geo-agent')).toBe(true);
  });

  it('bilinmeyen key → false', () => {
    expect(isCityContentAgentKey('unknown-agent')).toBe(false);
    expect(isCityContentAgentKey('')).toBe(false);
  });
});

describe('slugifyTr', () => {
  it('Türkçe karakter → ASCII (ğüşıöç)', () => {
    expect(slugifyTr('Şanlıurfa Kebabı')).toBe('sanliurfa-kebabi');
  });

  it('boşluk → hyphen', () => {
    expect(slugifyTr('hello world test')).toBe('hello-world-test');
  });

  it('multiple non-alphanumeric → tek hyphen', () => {
    expect(slugifyTr('a---b!!!c')).toBe('a-b-c');
  });

  it('leading/trailing hyphens trim', () => {
    expect(slugifyTr('---hello---')).toBe('hello');
  });

  it('uppercase → lowercase (tr-TR locale)', () => {
    expect(slugifyTr('GÖBEKLITEPE')).toBe('gobeklitepe');
  });

  it('boş → boş', () => {
    expect(slugifyTr('')).toBe('');
  });

  it('sadece punctuation → boş', () => {
    expect(slugifyTr('!!!---!!!')).toBe('');
  });
});

describe('CityContentAgentError', () => {
  it('default status 400 + code "city_content_agent_error"', () => {
    const err = new CityContentAgentError('test');
    expect(err.status).toBe(400);
    expect(err.code).toBe('city_content_agent_error');
    expect(err.name).toBe('CityContentAgentError');
  });

  it('custom status + code', () => {
    const err = new CityContentAgentError('not found', 404, 'draft_not_found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('draft_not_found');
  });

  it('extends Error — instanceof check', () => {
    expect(new CityContentAgentError('x')).toBeInstanceOf(Error);
  });
});
