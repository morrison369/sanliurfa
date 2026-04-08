/**
 * Phase 37: Natural Language Processing
 * Sentiment analysis, keyword extraction, text classification, language detection
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface SentimentResult {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  keywords: string[];
}

export interface KeywordResult {
  term: string;
  frequency: number;
  importance: number;
  idf: number;
}

// ==================== SENTIMENT ANALYZER ====================

export class SentimentAnalyzer {
  private positiveWords = new Set(['great', 'good', 'excellent', 'amazing', 'perfect', 'love', 'harika', 'mükemmel', 'güzel']);
  private negativeWords = new Set(['bad', 'terrible', 'awful', 'hate', 'poor', 'kötü', 'berbat']);

  /**
   * Analyze sentiment of text
   */
  analyze(text: string): SentimentResult {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;
    const keywords: string[] = [];

    for (const word of words) {
      const cleanWord = word.replace(/[.,!?;:]/g, '');

      if (this.positiveWords.has(cleanWord)) {
        positiveCount++;
        keywords.push(cleanWord);
      } else if (this.negativeWords.has(cleanWord)) {
        negativeCount++;
        keywords.push(cleanWord);
      }
    }

    const total = positiveCount + negativeCount;
    let score = 0;
    let label: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (total > 0) {
      score = (positiveCount - negativeCount) / total;

      if (score > 0.1) {
        label = 'positive';
      } else if (score < -0.1) {
        label = 'negative';
      }
    }

    return {
      score: Math.round(score * 100) / 100,
      label,
      confidence: Math.min(1, total / words.length),
      keywords: [...new Set(keywords)]
    };
  }

  /**
   * Analyze many texts
   */
  analyzeMany(texts: string[]): SentimentResult[] {
    return texts.map(text => this.analyze(text));
  }

  /**
   * Get sentiment trend
   */
  getSentimentTrend(results: SentimentResult[]): { avg: number; trend: 'improving' | 'declining' | 'stable' } {
    if (results.length === 0) {
      return { avg: 0, trend: 'stable' };
    }

    const avg = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    const midpoint = Math.floor(results.length / 2);
    const firstHalf = results.slice(0, midpoint).reduce((sum, r) => sum + r.score, 0) / midpoint;
    const secondHalf = results.slice(midpoint).reduce((sum, r) => sum + r.score, 0) / (results.length - midpoint);

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (secondHalf > firstHalf + 0.1) {
      trend = 'improving';
    } else if (secondHalf < firstHalf - 0.1) {
      trend = 'declining';
    }

    return { avg: Math.round(avg * 100) / 100, trend };
  }
}

// ==================== KEYWORD EXTRACTOR ====================

export class KeywordExtractor {
  private corpus = new Map<string, number>();

  /**
   * Extract keywords using TF-IDF
   */
  extract(text: string, topN: number = 10): KeywordResult[] {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/).map(w => w.replace(/[.,!?;:]/g, ''));

    const tf = new Map<string, number>();

    for (const word of words) {
      if (word.length > 2) {
        tf.set(word, (tf.get(word) || 0) + 1);
      }
    }

    const maxFreq = Math.max(...Array.from(tf.values()));

    const results: KeywordResult[] = Array.from(tf.entries())
      .map(([term, frequency]) => {
        const idf = Math.log(1 + (this.corpus.size / (this.corpus.get(term) || 1)));
        const importance = (frequency / maxFreq) * idf;

        return { term, frequency, idf, importance };
      })
      .sort((a, b) => b.importance - a.importance)
      .slice(0, topN);

    return results;
  }

  /**
   * Extract from many texts
   */
  extractFromMany(texts: string[]): KeywordResult[] {
    const allTerms = new Map<string, KeywordResult>();

    for (const text of texts) {
      const keywords = this.extract(text, 100);

      for (const kw of keywords) {
        const existing = allTerms.get(kw.term);

        if (existing) {
          existing.frequency += kw.frequency;
          existing.importance += kw.importance;
        } else {
          allTerms.set(kw.term, { ...kw });
        }
      }
    }

    return Array.from(allTerms.values()).sort((a, b) => b.importance - a.importance).slice(0, 20);
  }

  /**
   * Build corpus for IDF calculation
   */
  buildCorpus(documents: string[]): void {
    this.corpus.clear();

    for (const doc of documents) {
      const words = new Set(doc.toLowerCase().split(/\s+/));

      for (const word of words) {
        const clean = word.replace(/[.,!?;:]/g, '');
        if (clean.length > 2) {
          this.corpus.set(clean, (this.corpus.get(clean) || 0) + 1);
        }
      }
    }

    logger.debug('Corpus built', { uniqueTerms: this.corpus.size, documents: documents.length });
  }
}

// ==================== TEXT CLASSIFIER ====================

export class TextClassifier {
  private categories = new Map<string, string[]>();

  /**
   * Add category with examples
   */
  addCategory(categoryId: string, examples: string[]): void {
    this.categories.set(categoryId, examples);
    logger.debug('Category added', { categoryId, examples: examples.length });
  }

  /**
   * Classify text
   */
  classify(text: string): { categoryId: string; confidence: number }[] {
    const lowerText = text.toLowerCase();
    const words = new Set(lowerText.split(/\s+/));

    const scores: [string, number][] = [];

    for (const [categoryId, examples] of this.categories) {
      let matches = 0;

      for (const example of examples) {
        const exampleWords = example.toLowerCase().split(/\s+/);

        for (const word of exampleWords) {
          if (words.has(word)) {
            matches++;
          }
        }
      }

      const confidence = matches / (examples.length * 5);
      scores.push([categoryId, confidence]);
    }

    return scores
      .sort((a, b) => b[1] - a[1])
      .map(([id, conf]) => ({
        categoryId: id,
        confidence: Math.min(1, Math.round(conf * 100) / 100)
      }));
  }

  /**
   * Detect language
   */
  detectLanguage(text: string): string {
    const turkishChars = /[çğıöşüÇĞİÖŞÜ]/g;
    const turkishMatches = (text.match(turkishChars) || []).length;

    if (turkishMatches > text.length * 0.05) {
      return 'tr';
    }

    return 'en';
  }

  /**
   * Summarize text
   */
  summarize(text: string, maxWords: number = 50): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length === 0) return '';

    const scored: [string, number][] = sentences.map((sent, idx) => {
      const words = sent.toLowerCase().split(/\s+/);
      const score = (words.length / 20) * (1 - Math.abs(idx - sentences.length / 2) / sentences.length);

      return [sent.trim(), score];
    });

    const topSentences = scored
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.ceil(sentences.length / 2))
      .sort((a, b) => sentences.indexOf(a[0]) - sentences.indexOf(b[0]))
      .map(s => s[0]);

    return topSentences.join('. ').substring(0, maxWords);
  }
}

// ==================== EXPORTS ====================

export const sentimentAnalyzer = new SentimentAnalyzer();
export const keywordExtractor = new KeywordExtractor();
export const textClassifier = new TextClassifier();
