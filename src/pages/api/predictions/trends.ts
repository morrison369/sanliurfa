import type { APIRoute } from 'astro';
import { 
  analyzeVisitTrends, 
  predictSearchTrends,
  detectAnomalies,
  type TimeSeriesPoint,
} from '../../../lib/predictions';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'visits';
    const days = parseInt(url.searchParams.get('days') || '30');

    let result;

    switch (type) {
      case 'visits':
        result = await analyzeVisitTrends(days);
        break;
      case 'searches':
        result = await predictSearchTrends(days);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      type,
      data: result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Predictions error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { data, threshold = 2 } = body;

    if (!Array.isArray(data)) {
      return new Response(JSON.stringify({ error: 'Invalid data format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const timeSeries: TimeSeriesPoint[] = data.map((d: any) => ({
      date: new Date(d.date),
      value: d.value,
    }));

    const anomalies = detectAnomalies(timeSeries, threshold);

    return new Response(JSON.stringify({ 
      success: true, 
      anomalies,
      count: anomalies.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
