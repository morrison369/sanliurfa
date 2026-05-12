import type { APIRoute } from 'astro';
import { problemJson, safeErrorDetail } from '../../../lib/api';
import { getTransportStatusSnapshot } from '../../../lib/transport/status';

export const GET: APIRoute = async () => {
  try {
    const snapshot = await getTransportStatusSnapshot();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          updatedAt: snapshot.updatedAt,
          freshnessMinutes: snapshot.freshnessMinutes,
          stale: snapshot.stale,
          sources: snapshot.sources,
          healthyProviders: snapshot.healthyProviders,
          providerSnapshots: snapshot.providerSnapshots,
          busRoutesCount: snapshot.busRoutesCount,
          busSchedulesCount: snapshot.busSchedulesCount,
          nextBus: snapshot.nextBus,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Transport Status Alınamadı',
      detail: safeErrorDetail(error, 'transport_status_failed'),
      type: '/problems/transport-status-failed',
      instance: '/api/transport/status',
    });
  }
};
