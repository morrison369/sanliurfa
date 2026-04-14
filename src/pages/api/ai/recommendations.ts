import type { APIRoute } from 'astro';
import { verifyToken } from '../../../lib/auth';
import { getPersonalizedRecommendations, getSimilarItems, recordRecommendationFeedback } from '../../../lib/ai/recommendations';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Verify authentication
    const token = cookies.get('access_token')?.value;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = verifyToken(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse query params
    const url = new URL(request.url);
    const type = url.searchParams.get('type') as 'place' | 'blog' | 'event' | 'all' || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const recommendations = await getPersonalizedRecommendations(user.sub, {
      type,
      limit,
      excludeVisited: true,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: recommendations,
      count: recommendations.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const token = cookies.get('access_token')?.value;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = verifyToken(token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { recommendation, feedback } = body;

    if (!recommendation || !feedback) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await recordRecommendationFeedback(user.sub, recommendation, feedback);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Recommendation feedback error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
