import type { APIRoute } from 'astro';
import { getSiteSetting, upsertSiteSetting } from '../../../../lib/site-content';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isAdmin(locals: any) {
  return Boolean(locals?.isAdmin || locals?.user?.role === 'admin');
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? '****' : '';
  return key.slice(0, 4) + '****' + key.slice(-4);
}

export const GET: APIRoute = async ({ locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const email = await getSiteSetting<{ api_key?: string; from_email?: string }>('integrations.email', {});
  const analytics = await getSiteSetting<{ ga_id?: string }>('integrations.analytics', {});

  return json({
    success: true,
    data: {
      email: {
        api_key_set: Boolean(email.api_key),
        api_key_masked: maskKey(email.api_key || ''),
        from_email: email.from_email || '',
      },
      analytics: {
        ga_id: analytics.ga_id || '',
      },
    },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: any;
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
      const current = await getSiteSetting<{ api_key?: string; from_email?: string }>('integrations.email', {});
      const next: Record<string, string> = { ...current };
      // Boş string gönderilirse mevcut key korunur (maskeleme ile gelen değer)
      if (values.api_key && !values.api_key.includes('****')) {
        next.api_key = values.api_key.trim();
      }
      if (typeof values.from_email === 'string') {
        next.from_email = values.from_email.trim();
      }
      await upsertSiteSetting('integrations.email', next, 'Resend API key ve from email adresi', ctx.userId || null);
      return json({ success: true, message: 'E-posta ayarları kaydedildi' });
    }

    if (section === 'analytics') {
      const next = { ga_id: (values.ga_id || '').trim() };
      await upsertSiteSetting('integrations.analytics', next, 'Google Analytics Measurement ID', ctx.userId || null);
      return json({ success: true, message: 'Analytics ayarları kaydedildi' });
    }

    return json({ error: `Bilinmeyen section: ${section}` }, 400);
  } catch (err: any) {
    return json({ error: err?.message || 'Sunucu hatası' }, 500);
  }
};
