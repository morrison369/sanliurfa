import type { APIRoute } from 'astro';
import { getSimilarItems } from '../../../lib/ai/recommendations';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const itemId = url.searchParams.get('id');
    const itemType = url.searchParams.get('type') as 'place' | 'blog' | 'event' || 'place';
    const limit = parseInt(url.searchParams.get('limit') || '5');

    if (!itemId) {
      return new Response(JSON.stringify({ error: 'Missing item id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const similar = await getSimilarItems(itemId, itemType, limit);

    return new Response(JSON.stringify({ 
      success: true, 
      data: similar,
      count: similar.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Similar items error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
