import type { APIRoute } from 'astro';
import { parseNaturalLanguageQuery } from '../../../lib/voice-search';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing query' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = parseNaturalLanguageQuery(query);

    return new Response(JSON.stringify({ 
      success: true, 
      data: result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Voice parse error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
