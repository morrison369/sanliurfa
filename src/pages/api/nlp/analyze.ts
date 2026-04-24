import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';
import {
  tokenize, 
  extractKeywords, 
  analyzeSentiment, 
  extractEntities, 
  summarize,
  generateSearchSuggestions,
  spellCheck,
} from '../../../lib/nlp';

type AnalyzeOperation = 'all' | 'tokenize' | 'keywords' | 'sentiment' | 'entities' | 'summarize' | 'suggestions' | 'spellcheck';
type AnalyzeResult = {
  text: string;
  tokens?: ReturnType<typeof tokenize>;
  keywords?: string[];
  sentiment?: ReturnType<typeof analyzeSentiment>;
  entities?: ReturnType<typeof extractEntities>;
  summary?: ReturnType<typeof summarize>;
  suggestions?: ReturnType<typeof generateSearchSuggestions>;
  spellcheck?: ReturnType<typeof spellCheck>;
};

const isValidOperation = (value: string): value is AnalyzeOperation => {
  return [
    'all',
    'tokenize',
    'keywords',
    'sentiment',
    'entities',
    'summarize',
    'suggestions',
    'spellcheck',
  ].includes(value);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const text = typeof body.text === 'string' ? body.text : '';
    const operation: AnalyzeOperation = typeof body.operation === 'string' && isValidOperation(body.operation)
      ? body.operation
      : 'all';

    if (!text) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Missing text',
        type: '/problems/nlp-analyze-validation',
        instance: '/api/nlp/analyze',
      });
    }

    const result: AnalyzeResult = { text };

    switch (operation) {
      case 'tokenize':
        result.tokens = tokenize(text);
        break;
      case 'keywords':
        result.keywords = extractKeywords(text, 10);
        break;
      case 'sentiment':
        result.sentiment = analyzeSentiment(text);
        break;
      case 'entities':
        result.entities = extractEntities(text);
        break;
      case 'summarize':
        result.summary = summarize(text, 3);
        break;
      case 'suggestions':
        result.suggestions = generateSearchSuggestions(text);
        break;
      case 'spellcheck':
        result.spellcheck = spellCheck(text);
        break;
      case 'all':
      default:
        result.tokens = tokenize(text);
        result.keywords = extractKeywords(text, 10);
        result.sentiment = analyzeSentiment(text);
        result.entities = extractEntities(text);
        result.summary = summarize(text, 2);
        break;
    }

      return new Response(JSON.stringify({ 
        success: true, 
        data: result,
      }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('NLP analyze error:', error);
    return problemJson({
      status: 500,
      title: 'NLP Analizi Başarısız',
      detail: 'Internal server error',
      type: '/problems/nlp-analyze-failed',
      instance: '/api/nlp/analyze',
    });
  }
};
