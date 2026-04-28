import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeIntParam } from '../../../lib/api';
import {
  analyzeVisitTrends, 
  predictSearchTrends,
  detectAnomalies,
  type TimeSeriesPoint,
} from '../../../lib/predictions';

type RequestBody = {
  data?: unknown;
  threshold?: unknown;
};

type TimeSeriesInput = {
  date?: unknown;
  value?: unknown;
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'visits';
    const days = safeIntParam(url.searchParams.get('days'), 30, 0, 1_000_000);

    const result = await (async () => {
      switch (type) {
        case 'visits':
          return analyzeVisitTrends(days);
        case 'searches':
          return predictSearchTrends(days);
        default:
          return null;
      }
    })();

    if (!result) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Invalid type',
        type: '/problems/predictions-trends-type-invalid',
        instance: '/api/predictions/trends',
      });
    }

    return apiResponse({ 
      success: true, 
      type,
      data: result,
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Predictions error:', error);
    return problemJson({
      status: 500,
      title: 'Trend Tahmini Başarısız',
      detail: 'Internal server error',
      type: '/problems/predictions-trends-failed',
      instance: '/api/predictions/trends',
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as RequestBody;
    const data = body.data;
    const thresholdValue = body.threshold;
    const parsedThreshold = Number(thresholdValue);
    const threshold = Number.isFinite(parsedThreshold) ? parsedThreshold : 2;

    if (!Array.isArray(data)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Invalid data format',
        type: '/problems/predictions-trends-data-invalid',
        instance: '/api/predictions/trends',
      });
    }

    const timeSeries: TimeSeriesPoint[] = [];

    for (const row of data) {
      if (!row || typeof row !== 'object') {
        return problemJson({
          status: 400,
          title: 'Geçersiz İstek',
          detail: 'Invalid data format',
          type: '/problems/predictions-trends-data-invalid',
          instance: '/api/predictions/trends',
        });
      }

      const point = row as TimeSeriesInput;
      const parsedValue = Number(point.value);
      const dateValue = point.date;
      const parsedDate = dateValue instanceof Date ? dateValue : new Date(String(dateValue || ''));

      if (!Number.isFinite(parsedValue) || Number.isNaN(parsedDate.getTime())) {
        return problemJson({
          status: 400,
          title: 'Geçersiz İstek',
          detail: 'Invalid data format',
          type: '/problems/predictions-trends-data-invalid',
          instance: '/api/predictions/trends',
        });
      }

      timeSeries.push({
        date: parsedDate,
        value: parsedValue,
      });
    }

    const anomalies = detectAnomalies(timeSeries, threshold);

    return apiResponse({ 
      success: true, 
      anomalies,
      count: anomalies.length,
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Anomaly detection error:', error);
    return problemJson({
      status: 500,
      title: 'Anomali Analizi Başarısız',
      detail: 'Internal server error',
      type: '/problems/predictions-anomaly-failed',
      instance: '/api/predictions/trends',
    });
  }
};
