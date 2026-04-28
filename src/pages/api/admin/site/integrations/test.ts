/**
 * Integration Connectivity Test
 *
 * Lets the admin verify a saved integration actually works without leaving the panel.
 * Each section runs a minimal probe:
 *   - email: sends a real email to the requesting admin's address (uses sendEmail tier chain)
 *   - smtp: nodemailer.verify() — TCP connect + AUTH, no email sent
 *   - payment: lists Stripe customers (1 record) — proves the secret_key is valid
 *   - image_providers: queries Pexels with "test" — proves either api_key works
 *
 * Returns `{ success, tier?, message }`. Never leaks raw provider responses.
 */

import type { APIRoute } from 'astro';
import { apiResponse, problemJson, safeErrorDetail } from '../../../../../lib/api';
import { sendEmail, verifySmtpConnection } from '../../../../../lib/email';
import { getStripeConfig } from '../../../../../lib/stripe/stripe-config';
import { getImageProvidersConfig } from '../../../../../lib/media/image-providers-config';
import { OAUTH_PROVIDER_PRESETS } from '../../../../../lib/oauth/oauth-providers-helper';
import { queryOne } from '../../../../../lib/postgres';
import Stripe from 'stripe';

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Admin yetkisi gerekli',
      type: '/problems/admin-unauthorized',
      instance: '/api/admin/site/integrations/test',
    });
  }

  let body: { section?: string } = {};
  try {
    body = await request.json();
  } catch {
    return apiResponse({ success: false, message: 'Geçersiz JSON' }, 400);
  }
  const section = String(body.section || '').trim();

  try {
    if (section === 'email') {
      const adminEmail = locals.user?.email;
      if (!adminEmail) {
        return apiResponse({ success: false, message: 'Admin e-posta adresi bulunamadı' }, 400);
      }
      const result = await sendEmail({
        to: adminEmail,
        subject: '[Test] Sanliurfa.com entegrasyon kontrolü',
        html: `<p>Bu bir test e-postasıdır. Eğer bu mesajı aldıysanız, e-posta entegrasyonunuz çalışıyor demektir.</p><p>Gönderim zamanı: ${new Date().toLocaleString('tr-TR')}</p>`,
      });
      const tierLabel: Record<string, string> = {
        resend: 'Resend ile',
        smtp: 'SMTP ile',
        'dev-log': 'sadece geliştirme log\'una düştü (gerçek gönderim yok)',
      };
      const via = result.tier ? ` — ${tierLabel[result.tier] || result.tier}` : '';
      return apiResponse({
        success: result.success,
        tier: result.tier,
        message: result.success
          ? `Test e-postası gönderildi: ${adminEmail}${via}`
          : `Gönderim başarısız: ${result.error || 'bilinmeyen hata'}`,
      });
    }

    if (section === 'smtp') {
      const result = await verifySmtpConnection();
      return apiResponse({
        success: result.ok,
        message: result.ok
          ? `SMTP bağlantısı başarılı (${result.host})`
          : `SMTP testi başarısız: ${result.error}`,
      });
    }

    if (section === 'payment') {
      const cfg = await getStripeConfig();
      if (!cfg.secret_key) {
        return apiResponse({ success: false, message: 'Stripe secret_key yapılandırılmamış' }, 400);
      }
      try {
        const stripe = new Stripe(cfg.secret_key, { apiVersion: '2026-04-22.dahlia' });
        const customers = await stripe.customers.list({ limit: 1 });
        return apiResponse({
          success: true,
          message: `Stripe bağlantısı başarılı (${customers.data.length} müşteri kaydı erişilebilir)`,
        });
      } catch (e) {
        const msg = safeErrorDetail(e, 'Stripe API hatası');
        return apiResponse({ success: false, message: `Stripe testi başarısız: ${msg.slice(0, 200)}` });
      }
    }

    if (section === 'analytics') {
      // GA4 doesn't expose a query API for the Measurement Protocol from a key alone,
      // so we validate format only (G-XXXXXXXXXX). A real "is data flowing" check
      // requires opening GA4 Realtime — out of scope for this probe.
      const row = await queryOne<{ setting_value: { ga_id?: string } }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.analytics'`,
        [],
      );
      const gaId = row?.setting_value?.ga_id?.trim() || '';
      if (!gaId) {
        return apiResponse({ success: false, message: 'GA4 Measurement ID yapılandırılmamış' }, 400);
      }
      if (!/^G-[A-Z0-9]{8,12}$/.test(gaId)) {
        return apiResponse({
          success: false,
          message: `GA4 Measurement ID formatı geçersiz: "${gaId}" (beklenen: G-XXXXXXXXXX)`,
        });
      }
      return apiResponse({
        success: true,
        message: `Measurement ID formatı geçerli (${gaId}). Gerçek veri akışı için GA4 → Gerçek Zamanlı raporu kontrol edin.`,
      });
    }

    if (section === 'oauth') {
      // Probe a single OAuth provider's auth_url + verify DB has client_id/secret.
      // Doesn't run a real OAuth flow; just checks the endpoint is reachable and config is set.
      const providerKey = String((body as { provider_key?: string }).provider_key || '').trim();
      const preset = OAUTH_PROVIDER_PRESETS[providerKey];
      if (!preset) {
        return apiResponse(
          { success: false, message: `Bilinmeyen provider_key: ${providerKey} (google | facebook | twitter)` },
          400,
        );
      }
      const row = await queryOne<{ client_id?: string; client_secret?: string; is_enabled?: boolean }>(
        'SELECT client_id, client_secret, is_enabled FROM oauth_providers WHERE provider_key = $1',
        [providerKey],
      );
      if (!row?.client_id || !row?.client_secret) {
        return apiResponse(
          { success: false, message: `${preset.provider_name}: client_id veya client_secret yapılandırılmamış` },
          400,
        );
      }
      try {
        // HEAD probe of auth_url; some providers (Twitter) return 4xx for HEAD but
        // anything other than a network error means the endpoint is alive.
        const r = await fetch(preset.auth_url, { method: 'HEAD', redirect: 'manual' });
        const reachable = r.status > 0 && r.status < 600;
        const enabled = Boolean(row.is_enabled);
        return apiResponse({
          success: reachable,
          message: reachable
            ? `${preset.provider_name}: auth endpoint erişilebilir (status ${r.status})${enabled ? ', etkin' : ', devre dışı'}`
            : `${preset.provider_name}: auth endpoint yanıt vermiyor`,
        });
      } catch (e) {
        return apiResponse({
          success: false,
          message: `${preset.provider_name}: ${safeErrorDetail(e, 'network error')}`,
        });
      }
    }

    if (section === 'image_providers') {
      const cfg = await getImageProvidersConfig();
      const results: string[] = [];
      if (cfg.unsplash_access_key) {
        try {
          const r = await fetch(
            'https://api.unsplash.com/search/photos?query=test&per_page=1',
            { headers: { Authorization: `Client-ID ${cfg.unsplash_access_key}` } },
          );
          results.push(r.ok ? 'Unsplash ✓' : `Unsplash ✗ (${r.status})`);
        } catch {
          results.push('Unsplash ✗ (network)');
        }
      }
      if (cfg.pexels_api_key) {
        try {
          const r = await fetch(
            'https://api.pexels.com/v1/search?query=test&per_page=1',
            { headers: { Authorization: cfg.pexels_api_key } },
          );
          results.push(r.ok ? 'Pexels ✓' : `Pexels ✗ (${r.status})`);
        } catch {
          results.push('Pexels ✗ (network)');
        }
      }
      if (results.length === 0) {
        return apiResponse({ success: false, message: 'Hiçbir resim sağlayıcı yapılandırılmamış' }, 400);
      }
      const allOk = results.every(r => r.endsWith('✓'));
      return apiResponse({ success: allOk, message: results.join(', ') });
    }

    return apiResponse(
      { success: false, message: `Bilinmeyen section: ${section}` },
      400,
    );
  } catch (error) {
    return apiResponse({
      success: false,
      message: safeErrorDetail(error, 'Test sırasında beklenmeyen hata'),
    }, 500);
  }
};
