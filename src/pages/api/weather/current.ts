import type { APIRoute } from 'astro';
import { getSanliurfaWeather } from '../../../lib/weather/open-meteo';
import { problemJson, safeErrorDetail } from '../../../lib/api';

export const GET: APIRoute = async ({ url }) => {
  const forceRefresh = url.searchParams.get('refresh') === '1';

  try {
    const { payload, fromCache } = await getSanliurfaWeather({ forceRefresh });
    return new Response(
      JSON.stringify({
        success: true,
        fromCache,
        data: payload,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=900',
        },
      },
    );
  } catch (error) {
    return problemJson({
      status: 503,
      title: 'Weather upstream unavailable',
      detail: safeErrorDetail(error, 'weather_unavailable'),
      type: '/problems/weather-upstream-unavailable',
      instance: '/api/weather/current',
    });
  }
};
