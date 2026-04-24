import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getSocialFeatureConfig } from '../../../lib/social/match-features';
import { getSwipeQuota } from '../../../lib/social/matchmaking-db';
import { problemJson } from '../../../lib/api';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş gerekli',
        type: '/problems/auth-required',
        instance: '/api/social/capabilities',
      });
    }

    const config = getSocialFeatureConfig();
    const quota = await getSwipeQuota(auth.user.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          features: config,
          quota,
          premiumRequired: false,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Social Capabilities Error',
      detail: error instanceof Error ? error.message : 'Failed to fetch capabilities',
      type: '/problems/social-capabilities-failed',
      instance: '/api/social/capabilities',
    });
  }
};
