import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail } from '../../../../lib/api';
import { getSiteSetting, upsertSiteSetting } from '../../../../lib/site-content';
import { invalidateStripeConfigCache } from '../../../../lib/stripe/stripe-config';
import { invalidateImageProvidersCache } from '../../../../lib/media/image-providers-config';
import { invalidateEmailConfigCache } from '../../../../lib/email';
import {
  listOAuthProvidersForAdmin,
  upsertOAuthProviderFromAdmin,
} from '../../../../lib/oauth/oauth-providers-helper';
import { getPublicAppUrl } from '../../../../lib/public-app-url';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? '****' : '';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const email = await getSiteSetting<{ api_key?: string; from_email?: string; daily_limit_per_recipient?: number }>('integrations.email', {});
  const analytics = await getSiteSetting<{ ga_id?: string }>('integrations.analytics', {});
  const payment = await getSiteSetting<{ secret_key?: string; publishable_key?: string; webhook_secret?: string }>(
    'integrations.payment',
    {},
  );
  const imageProviders = await getSiteSetting<{ unsplash_access_key?: string; pexels_api_key?: string }>(
    'integrations.image_providers',
    {},
  );
  const smtp = await getSiteSetting<{
    host?: string;
    port?: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from_email?: string;
  }>('integrations.smtp', {});
  const oauthProviders = await listOAuthProvidersForAdmin();

  const baseUrl = getPublicAppUrl();
  return json({
    success: true,
    data: {
      // Setup helpers — admin needs to register these URLs on the provider side.
      setup_urls: {
        stripe_webhook: `${baseUrl}/api/billing/webhook`,
        oauth_callback: `${baseUrl}/api/auth/oauth/callback`,
        public_app_url: baseUrl,
      },
      email: {
        api_key_set: Boolean(email.api_key),
        api_key_masked: maskKey(email.api_key || ''),
        from_email: email.from_email || '',
        daily_limit_per_recipient: typeof email.daily_limit_per_recipient === 'number' ? email.daily_limit_per_recipient : 10,
      },
      analytics: {
        ga_id: analytics.ga_id || '',
      },
      payment: {
        secret_key_set: Boolean(payment.secret_key),
        secret_key_masked: maskKey(payment.secret_key || ''),
        publishable_key: payment.publishable_key || '',
        webhook_secret_set: Boolean(payment.webhook_secret),
        webhook_secret_masked: maskKey(payment.webhook_secret || ''),
      },
      image_providers: {
        unsplash_set: Boolean(imageProviders.unsplash_access_key),
        unsplash_masked: maskKey(imageProviders.unsplash_access_key || ''),
        pexels_set: Boolean(imageProviders.pexels_api_key),
        pexels_masked: maskKey(imageProviders.pexels_api_key || ''),
      },
      smtp: {
        host: smtp.host || '',
        port: smtp.port || 587,
        secure: Boolean(smtp.secure),
        user: smtp.user || '',
        pass_set: Boolean(smtp.pass),
        pass_masked: maskKey(smtp.pass || ''),
        from_email: smtp.from_email || '',
      },
      oauth: {
        providers: oauthProviders,
      },
    },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Geçersiz JSON' }, 400);
  }

  const { section, ...values } = body as { section: string; [k: string]: string };

  if (!section) return json({ error: 'section zorunlu (email | analytics)' }, 400);

  const ctx = {
    userId: locals.user?.id || null,
    actorEmail: locals.user?.email || null,
    ipAddress: request.headers.get('x-forwarded-for') || null,
    userAgent: request.headers.get('user-agent') || null,
  };

  try {
    if (section === 'email') {
      const current = await getSiteSetting<{ api_key?: string; from_email?: string; daily_limit_per_recipient?: number }>('integrations.email', {});
      const next: Record<string, unknown> = { ...current };
      // Boş string gönderilirse mevcut key korunur (maskeleme ile gelen değer)
      if (values.api_key && !values.api_key.includes('****')) {
        next.api_key = values.api_key.trim();
      }
      if (typeof values.from_email === 'string') {
        next.from_email = values.from_email.trim();
      }
      // Daily limit may arrive as string from the form; coerce. 0 means rate limiting disabled.
      const limitRaw = (values as Record<string, unknown>).daily_limit_per_recipient;
      if (limitRaw !== undefined && limitRaw !== '') {
        const n = Number(limitRaw);
        if (Number.isFinite(n) && n >= 0) next.daily_limit_per_recipient = n;
      }
      await upsertSiteSetting('integrations.email', next, 'Resend API key, from email ve günlük kişi başı limit', ctx.userId || null);
      // Drop the in-process cache so email/index.ts picks up the new key on the next send.
      invalidateEmailConfigCache();
      return json({ success: true, message: 'E-posta ayarları kaydedildi' });
    }

    if (section === 'analytics') {
      const next = { ga_id: (values.ga_id || '').trim() };
      await upsertSiteSetting('integrations.analytics', next, 'Google Analytics Measurement ID', ctx.userId || null);
      return json({ success: true, message: 'Analytics ayarları kaydedildi' });
    }

    if (section === 'smtp') {
      const current = await getSiteSetting<{
        host?: string;
        port?: number;
        secure?: boolean;
        user?: string;
        pass?: string;
        from_email?: string;
      }>('integrations.smtp', {});
      const next: Record<string, unknown> = { ...current };
      if (typeof values.host === 'string') next.host = values.host.trim();
      if (typeof values.port === 'string' || typeof values.port === 'number') {
        const p = Number(values.port);
        if (Number.isFinite(p) && p > 0) next.port = p;
      }
      // secure may arrive as boolean or string from the form
      const secureRaw = (values as Record<string, unknown>).secure;
      if (typeof secureRaw === 'boolean') next.secure = secureRaw;
      else if (secureRaw === 'true' || secureRaw === 'false') next.secure = secureRaw === 'true';
      if (typeof values.user === 'string') next.user = values.user.trim();
      // Mask placeholder check — preserve existing pass if input is empty or masked.
      if (values.pass && !values.pass.includes('****')) next.pass = values.pass;
      if (typeof values.from_email === 'string') next.from_email = values.from_email.trim();
      await upsertSiteSetting(
        'integrations.smtp',
        next,
        'SMTP sunucu ayarları (Resend yoksa fallback)',
        ctx.userId || null,
      );
      invalidateEmailConfigCache();
      return json({ success: true, message: 'SMTP ayarları kaydedildi' });
    }

    if (section === 'payment') {
      const current = await getSiteSetting<{
        secret_key?: string;
        publishable_key?: string;
        webhook_secret?: string;
      }>('integrations.payment', {});
      const next: Record<string, string> = { ...current };
      // Masked values come back from GET; ignore them so the existing key is preserved.
      if (values.secret_key && !values.secret_key.includes('****')) {
        next.secret_key = values.secret_key.trim();
      }
      if (values.webhook_secret && !values.webhook_secret.includes('****')) {
        next.webhook_secret = values.webhook_secret.trim();
      }
      if (typeof values.publishable_key === 'string') {
        next.publishable_key = values.publishable_key.trim();
      }
      await upsertSiteSetting(
        'integrations.payment',
        next,
        'Stripe API anahtarları (secret, publishable, webhook secret)',
        ctx.userId || null,
      );
      // Drop the in-process cache so subsequent calls pick up the new key immediately
      // (otherwise admin would wait up to 60s for the TTL).
      invalidateStripeConfigCache();
      return json({ success: true, message: 'Ödeme ayarları kaydedildi' });
    }

    if (section === 'oauth') {
      // Expected payload: { section: 'oauth', provider_key, client_id?, client_secret?, is_enabled? }
      const providerKey = String(values.provider_key || '').trim();
      if (!providerKey) {
        return json({ error: 'provider_key zorunlu (google | facebook | twitter)' }, 400);
      }
      const isEnabledRaw = (values as Record<string, unknown>).is_enabled;
      await upsertOAuthProviderFromAdmin({
        provider_key: providerKey,
        client_id: typeof values.client_id === 'string' ? values.client_id.trim() : undefined,
        client_secret: typeof values.client_secret === 'string' ? values.client_secret : undefined,
        is_enabled:
          typeof isEnabledRaw === 'boolean'
            ? isEnabledRaw
            : isEnabledRaw === 'true'
              ? true
              : isEnabledRaw === 'false'
                ? false
                : undefined,
      });
      return json({ success: true, message: `${providerKey} ayarları kaydedildi` });
    }

    if (section === 'image_providers') {
      const current = await getSiteSetting<{ unsplash_access_key?: string; pexels_api_key?: string }>(
        'integrations.image_providers',
        {},
      );
      const next: Record<string, string> = { ...current };
      if (values.unsplash_access_key && !values.unsplash_access_key.includes('****')) {
        next.unsplash_access_key = values.unsplash_access_key.trim();
      }
      if (values.pexels_api_key && !values.pexels_api_key.includes('****')) {
        next.pexels_api_key = values.pexels_api_key.trim();
      }
      await upsertSiteSetting(
        'integrations.image_providers',
        next,
        'Resim sağlayıcıları (Unsplash, Pexels)',
        ctx.userId || null,
      );
      invalidateImageProvidersCache();
      return json({ success: true, message: 'Resim sağlayıcıları kaydedildi' });
    }

    return json({ error: `Bilinmeyen section: ${section}` }, 400);
  } catch (err) {
    return json({ error: safeErrorDetail(err, 'Sunucu hatası') }, 500);
  }
};
