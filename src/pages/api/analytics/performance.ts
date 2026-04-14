// @ts-nocheck
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || typeof data.value !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Store in database (using stub for now)
    const metricEntry = {
      id: crypto.randomUUID(),
      name: data.name,
      value: data.value,
      url: data.url || '',
      user_agent: request.headers.get('user-agent') || '',
      ip: locals.clientAddress || '',
      timestamp: new Date().toISOString(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Performance:', metricEntry);
    }

    // In production, store to database
    // await db.insert('performance_metrics', metricEntry);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET endpoint to retrieve metrics (admin only)
export const GET: APIRoute = async ({ request }) => {
  // Check admin auth here
  
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const metric = url.searchParams.get('metric');

  // Return stub data
  const metrics = [
    { name: 'LCP', avg: 1200, p75: 1800, p95: 2500 },
    { name: 'FID', avg: 45, p75: 80, p95: 150 },
    { name: 'CLS', avg: 0.05, p75: 0.08, p95: 0.12 },
    { name: 'FCP', avg: 900, p75: 1200, p95: 1800 },
    { name: 'TTFB', avg: 400, p75: 600, p95: 900 },
  ];

  return new Response(
    JSON.stringify({
      metrics: metric ? metrics.filter(m => m.name === metric) : metrics,
      from,
      to,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
