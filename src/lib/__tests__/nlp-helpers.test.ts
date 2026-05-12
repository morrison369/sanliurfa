/**
 * Unit Tests — nlp/index.ts Turkish text analysis helpers (pure)
 *
 * - tokenize (Turkish chars + stop word filter + n-grams bigram/trigram)
 * - normalizeText (toLocaleLowerCase tr-TR + whitespace collapse)
 * - extractKeywords (frequency + bigram boost ×2 + topN)
 * - textSimilarity (Jaccard set intersection / union)
 * - analyzeSentiment (positive/negative word + negation flip)
 * - extractEntities (location/time/number regex)
 * - detectLanguage (tr char + tr word score)
 * - summarize (sentence keyword density + topN preserve order)
 * - spellCheck (Levenshtein edit distance ≤ 2)
 */

import { describe, it, expect } from 'vitest';
import {
  tokenize,
  normalizeText,
  extractKeywords,
  textSimilarity,
  analyzeSentiment,
  extractEntities,
  detectLanguage,
  summarize,
  spellCheck,
} from '../nlp/index';

describe('tokenize', () => {
  it('Turkish chars + stop word filter', () => {
    const result = tokenize('Bu kebap cok lezzetli ve harika');
    expect(result.tokens).toContain('kebap');
    expect(result.tokens).toContain('lezzetli');
    expect(result.tokens).toContain('harika');
    expect(result.tokens).not.toContain('bu'); // stop word
    expect(result.tokens).not.toContain('ve'); // stop word
  });

  it('bigrams + trigrams generated', () => {
    const result = tokenize('sanliurfa kebap lezzetli urfa');
    expect(result.bigrams.length).toBeGreaterThanOrEqual(1);
    expect(result.bigrams[0]).toContain('_');
    expect(result.trigrams.length).toBeGreaterThanOrEqual(1);
  });

  it('boş string → boş tokens', () => {
    const result = tokenize('');
    expect(result.tokens).toEqual([]);
  });

  it('punctuation filtered (only a-z0-9çğıöşüâ)', () => {
    const result = tokenize('kebap, lahmacun! baklava?');
    expect(result.tokens).toEqual(expect.arrayContaining(['kebap', 'lahmacun', 'baklava']));
  });
});

describe('normalizeText', () => {
  it('lowercase + whitespace collapse + trim', () => {
    expect(normalizeText('  HELLO   WORLD  ')).toBe('hello world');
  });

  it('idempotent (already-normalized passes through)', () => {
    const out = normalizeText('kebap lezzetli');
    expect(out).toBe('kebap lezzetli');
  });
});

describe('extractKeywords', () => {
  it('topN parametresi sınırlar', () => {
    const text = 'kebap kebap lahmacun baklava sira cigkofte fistik biber patlican';
    const kw = extractKeywords(text, 3);
    expect(kw.length).toBeLessThanOrEqual(3);
  });

  it('frequency desc ordering — en sık kelime kebap (single veya bigram)', () => {
    const text = 'kebap kebap kebap lahmacun lezzetli';
    const kw = extractKeywords(text, 5);
    // 'kebap' single (3 freq) ya da 'kebap kebap' bigram (×2 boost) en üstte olabilir
    expect(kw[0]).toMatch(/kebap/);
  });
});

describe('textSimilarity', () => {
  it('aynı text → 1.0 (full overlap)', () => {
    expect(textSimilarity('kebap lezzetli urfa', 'kebap lezzetli urfa')).toBe(1);
  });

  it('disjoint text → 0', () => {
    expect(textSimilarity('kebap lahmacun', 'mountain river')).toBe(0);
  });

  it('boş input → 0', () => {
    expect(textSimilarity('', 'kebap')).toBe(0);
    expect(textSimilarity('kebap', '')).toBe(0);
  });

  it('partial overlap → 0-1 arası', () => {
    const sim = textSimilarity('kebap lezzetli urfa', 'kebap baklava harika');
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });
});

describe('analyzeSentiment', () => {
  it('positive — harika/guzel/lezzetli → positive label', () => {
    const r = analyzeSentiment('kebap harika lezzetli mukemmel');
    expect(r.label).toBe('positive');
    expect(r.score).toBeGreaterThan(0);
  });

  it('negative — kotu/berbat → negative label', () => {
    const r = analyzeSentiment('kotu berbat rezalet');
    expect(r.label).toBe('negative');
    expect(r.score).toBeLessThan(0);
  });

  it('neutral — sentiment word yok → score 0 + confidence 1', () => {
    const r = analyzeSentiment('kebap lahmacun');
    expect(r.score).toBe(0);
    expect(r.label).toBe('neutral');
    expect(r.confidence).toBe(1);
  });
});

describe('extractEntities', () => {
  it('location pattern (district adı)', () => {
    const e = extractEntities('Haliliye merkez kafesi');
    expect(e.some((x) => x.type === 'location')).toBe(true);
  });

  it('time pattern (HH:MM)', () => {
    const e = extractEntities('saat 14:30 acik');
    expect(e.some((x) => x.type === 'time')).toBe(true);
  });

  it('number pattern (TL/€)', () => {
    const e = extractEntities('fiyat 100 TL');
    expect(e.some((x) => x.type === 'number')).toBe(true);
  });
});

describe('detectLanguage', () => {
  it('Turkish chars + words → tr', () => {
    const r = detectLanguage('Bu cok guzel bir sehir, tarihi yapilar var');
    expect(r.language).toBe('tr');
    expect(r.confidence).toBeGreaterThan(0);
  });

  it('English text → unknown', () => {
    const r = detectLanguage('hello world from a faraway place');
    expect(r.language).toBe('unknown');
  });
});

describe('summarize', () => {
  it('text < maxSentences → orijinal döner', () => {
    const text = 'Tek cumle.';
    expect(summarize(text, 3)).toBe(text);
  });

  it('uzun text → maxSentences kadar cumle', () => {
    const text = Array.from({ length: 10 }, (_, i) => `Bu ${i}-inci uzun cumle, kebap ve lahmacun hakkinda bilgi veriyor.`).join(' ');
    const result = summarize(text, 3);
    expect(result.length).toBeLessThan(text.length);
  });
});

describe('spellCheck', () => {
  it('dictionary kelime → correct true', () => {
    expect(spellCheck('kebap').correct).toBe(true);
    expect(spellCheck('urfa').correct).toBe(true);
  });

  it('yanlis yazim → suggestions array (Levenshtein <= 2)', () => {
    const r = spellCheck('kebab'); // 1 edit from kebap
    expect(r.correct).toBe(false);
    expect(r.suggestions).toContain('kebap');
  });

  it('cok farkli kelime → boş suggestions', () => {
    const r = spellCheck('totallyrandomxyzword');
    expect(r.correct).toBe(false);
    expect(r.suggestions).toEqual([]);
  });
});
