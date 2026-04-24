import type { APIRoute } from 'astro';
import { problemJson } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || 'https://sanliurfa.com').replace(/\/$/, '');

export const GET: APIRoute = async ({ url }) => {
  try {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
      logger.warn(
        'Facebook OAuth requested but provider credentials are missing',
        Object.assign(new Error('Facebook OAuth not configured'), { hasAppId: !!appId, hasAppSecret: !!appSecret })
      );
      return problemJson({
        status: 503,
        title: 'Facebook OAuth Yapılandırılmamış',
        detail: 'FACEBOOK_APP_ID ve FACEBOOK_APP_SECRET ortam değişkenleri tanımlı değil.',
        type: `${PUBLIC_APP_URL}/problems/oauth-provider-not-configured`,
        extensions: { provider: 'facebook' },
      });
    }

    const redirectUri =
      url.searchParams.get('redirect_uri') || `${process.env.SITE_URL || url.origin}/api/auth/oauth/callback`;

    const authorizeUrl = new URL('/api/auth/oauth/authorize', url.origin);
    authorizeUrl.searchParams.set('provider', 'facebook');
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);

    return new Response(null, {
      status: 302,
      headers: {
        Location: authorizeUrl.toString(),
      },
    });
  } catch (error: any) {
    logger.error('Facebook OAuth bootstrap failed', error);
    return problemJson({
      status: 500,
      title: 'Facebook OAuth Başlatılamadı',
      detail: error instanceof Error ? error.message : 'Bilinmeyen hata',
      type: `${PUBLIC_APP_URL}/problems/oauth-bootstrap-failed`,
      extensions: { provider: 'facebook' },
    });
  }
};
