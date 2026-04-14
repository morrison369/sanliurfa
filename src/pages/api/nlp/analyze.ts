import type { APIRoute } from 'astro';
import { 
  tokenize, 
  extractKeywords, 
  analyzeSentiment, 
  extractEntities, 
  summarize,
  generateSearchSuggestions,
  spellCheck,
} from '../../../lib/nlp';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { text, operation = 'all' } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result: Record<string, any> = { text };

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
    console.error('NLP analyze error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
