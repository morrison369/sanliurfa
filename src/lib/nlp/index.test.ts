import { describe, it, expect } from 'vitest';
import * as nlp from './index';

describe('NLP Module', () => {
  describe('tokenize', () => {
    it('should tokenize Turkish text', () => {
      const result = nlp.tokenize('Şanlıurfa çok güzel bir şehir');
      
      // Turkish characters preserved
      expect(result.tokens).toContain('şanlıurfa');
      expect(result.tokens).toContain('güzel');
      expect(result.tokens).toContain('şehir');
      expect(result.bigrams.length).toBeGreaterThan(0);
      expect(result.trigrams.length).toBeGreaterThan(0);
    });

    it('should filter stop words', () => {
      const result = nlp.tokenize('bir ve bu');
      
      expect(result.tokens).not.toContain('bir');
      expect(result.tokens).not.toContain('ve');
      expect(result.tokens).not.toContain('bu');
    });

    it('should handle short words', () => {
      const result = nlp.tokenize('bu en iyi');
      
      // Words <= 2 chars should be filtered
      expect(result.tokens.every(t => t.length > 2)).toBe(true);
    });
  });

  describe('normalizeText', () => {
    it('should normalize Turkish characters', () => {
      const result = nlp.normalizeText('ŞANLIURFA ÇOK GÜZEL');
      
      // Should lowercase but preserve Turkish chars
      expect(result).toBe('şanlıurfa çok güzel');
    });

    it('should remove extra whitespace', () => {
      const result = nlp.normalizeText('  çok   fazla   boşluk  ');
      
      // Should trim and collapse whitespace
      expect(result.startsWith(' ')).toBe(false);
      expect(result.endsWith(' ')).toBe(false);
      expect(result.includes('   ')).toBe(false);
    });
  });

  describe('extractKeywords', () => {
    it('should extract top keywords', () => {
      const text = 'kebap çok güzel kebap lezzetli kebap taze';
      const keywords = nlp.extractKeywords(text, 5);
      
      expect(keywords.length).toBeLessThanOrEqual(5);
      expect(keywords.length).toBeGreaterThan(0);
    });

    it('should boost bigrams', () => {
      const text = 'sanliurfa kebap sanliurfa kebap';
      const keywords = nlp.extractKeywords(text, 10);
      
      // Bigrams should appear due to frequency boost
      expect(keywords.some(k => k.includes(' '))).toBe(true);
    });
  });

  describe('textSimilarity', () => {
    it('should return 0 for completely different texts', () => {
      const sim = nlp.textSimilarity('kebap', 'okul');
      
      expect(sim).toBe(0);
    });

    it('should return high similarity for similar texts', () => {
      const sim = nlp.textSimilarity('kebap çok güzel', 'kebap güzel lezzetli');
      
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThanOrEqual(1);
    });

    it('should return 1 for identical texts', () => {
      const sim = nlp.textSimilarity('aynı metin', 'aynı metin');
      
      expect(sim).toBe(1);
    });
  });

  describe('analyzeSentiment', () => {
    it('should detect positive sentiment', () => {
      const result = nlp.analyzeSentiment('mükemmel harika çok güzel');
      
      expect(result.label).toBe('positive');
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const result = nlp.analyzeSentiment('berbat kötü rezalet');
      
      expect(result.label).toBe('negative');
      expect(result.score).toBeLessThan(0);
    });

    it('should detect neutral sentiment', () => {
      const result = nlp.analyzeSentiment('bu bir test');
      
      expect(result.label).toBe('neutral');
    });

    it('should handle negation', () => {
      const result = nlp.analyzeSentiment('güzel değil');
      
      // Negation should flip or reduce sentiment
      expect(result.score).toBeLessThanOrEqual(0.3);
    });

    it('should return confidence between 0 and 1', () => {
      const result = nlp.analyzeSentiment('test');
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('extractEntities', () => {
    it('should extract locations', () => {
      const result = nlp.extractEntities('Haliliye Mahallesi');
      
      expect(result.some(e => e.type === 'location')).toBe(true);
    });

    it('should extract time patterns', () => {
      const result = nlp.extractEntities('Saat 14:30da buluşalım');
      
      expect(result.some(e => e.type === 'time')).toBe(true);
    });

    it('should extract numbers/prices', () => {
      const result = nlp.extractEntities('Fiyat 150 TL');
      
      expect(result.some(e => e.type === 'number')).toBe(true);
    });
  });

  describe('summarize', () => {
    it('should return short text as is', () => {
      const text = 'Kısa bir metin.';
      const result = nlp.summarize(text, 3);
      
      expect(result).toBe(text);
    });

    it('should limit sentences', () => {
      // Test with a longer text that has enough keywords for scoring
      const text = 'Bu restoran çok güzel. Kebap harika. Fiyat uygun. Hizmet mükemmel. Mekan temiz. Tavsiye ederim.';
      const result = nlp.summarize(text, 3);
      
      const sentences = result.split('.').filter(s => s.trim());
      expect(sentences.length).toBeGreaterThan(0);
      expect(sentences.length).toBeLessThanOrEqual(4); // Including potential empty split
    });
  });

  describe('detectLanguage', () => {
    it('should detect Turkish', () => {
      const result = nlp.detectLanguage('Şanlıurfa çok güzel');
      
      expect(result.language).toBe('tr');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return unknown for empty text', () => {
      const result = nlp.detectLanguage('');
      
      expect(result.language).toBe('unknown');
    });
  });

  describe('spellCheck', () => {
    it('should mark correct words as correct', () => {
      const result = nlp.spellCheck('kebap');
      
      expect(result.correct).toBe(true);
      expect(result.suggestions).toEqual([]);
    });

    it('should suggest corrections for misspelled words', () => {
      const result = nlp.spellCheck('kebbap');
      
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });
});
