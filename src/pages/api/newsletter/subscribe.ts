// API: Newsletter subscription (PostgreSQL)
import type { APIRoute } from 'astro';
import { queryOne, query } from '../../../lib/postgres';
import { sendEmail } from '../../../lib/email';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';
import { getPublicAppUrl } from '../../../lib/public-app-url';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'E-posta adresi gereklidir',
        type: '/problems/newsletter-subscribe-validation',
        instance: '/api/newsletter/subscribe',
      });
    }

    // Email validation
    if (typeof email !== 'string' || email.length > 254) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'E-posta adresi 254 karakterden uzun olamaz',
        type: '/problems/newsletter-subscribe-email-too-long',
        instance: '/api/newsletter/subscribe',
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Geçerli bir e-posta adresi girin',
        type: '/problems/newsletter-subscribe-email-invalid',
        instance: '/api/newsletter/subscribe',
      });
    }

    // Atomic upsert — eliminates SELECT→INSERT race (HARD RULE #47)
    const upsertResult = await query(
      `INSERT INTO newsletter_subscribers (email, subscribed_at, status)
       VALUES ($1, NOW(), 'active')
       ON CONFLICT (email) DO UPDATE
       SET status = 'active', subscribed_at = NOW()
       RETURNING id, (xmax = 0) AS is_new`,
      [email]
    );
    const isNew: boolean = upsertResult.rows[0]?.is_new === true;

    if (isNew) {
      const welcomeMail = await sendEmail({
        to: email,
        subject: "Sanliurfa.com Bültenine Hoşgeldiniz!",
        html: `<p>Bültenimize abone olduğunuz için teşekkür ederiz. Şanlıurfa'daki etkinlikler, mekanlar ve haberlerden ilk siz haberdar olacaksınız.</p>
<p><a href="${getPublicAppUrl()}/newsletter/unsubscribe?email=${encodeURIComponent(email)}">Abonelikten çıkmak için tıklayın</a></p>`,
      });
      if (!welcomeMail.success) {
        logger.warn('Newsletter welcome email failed', { email, error: welcomeMail.error });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isNew ? 'Bültenimize başarıyla abone oldunuz!' : 'Aboneliğiniz zaten aktif',
      }),
      { status: isNew ? 201 : 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error('Newsletter subscription error:', err);
    return problemJson({
      status: 500,
      title: 'Bülten Aboneliği Başarısız',
      detail: 'Bir hata oluştu',
      type: '/problems/newsletter-subscribe-failed',
      instance: '/api/newsletter/subscribe',
    });
  }
};

// Unsubscribe
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string' || email.length > 254) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Geçerli bir e-posta adresi gereklidir',
        type: '/problems/newsletter-unsubscribe-validation',
        instance: '/api/newsletter/subscribe',
      });
    }

    await queryOne(
      'UPDATE newsletter_subscribers SET status = $1, unsubscribed_at = $2 WHERE email = $3',
      ['unsubscribed', new Date().toISOString(), email]
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Abonelikten çıktınız' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error('Unsubscribe error:', err);
    return problemJson({
      status: 500,
      title: 'Bülten Abonelikten Çıkış Başarısız',
      detail: 'Bir hata oluştu',
      type: '/problems/newsletter-unsubscribe-failed',
      instance: '/api/newsletter/subscribe',
    });
  }
};
