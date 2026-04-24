// API: Newsletter subscription (PostgreSQL)
import type { APIRoute } from 'astro';
import { queryOne, insert } from '../../../lib/postgres';
import { sendEmail } from '../../../lib/email';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

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

    // Check if already subscribed
    const existing = await queryOne(
      'SELECT id, status FROM newsletter_subscribers WHERE email = $1',
      [email]
    );

    if (existing && existing.status === 'active') {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Bu e-posta adresi zaten kayıtlı',
        type: '/problems/newsletter-subscribe-already-exists',
        instance: '/api/newsletter/subscribe',
      });
    }

    if (existing) {
      // Re-subscribe
      await queryOne(
        'UPDATE newsletter_subscribers SET status = $1, subscribed_at = $2 WHERE id = $3',
        ['active', new Date().toISOString(), existing.id]
      );
    } else {
      // Insert new subscriber
      await insert('newsletter_subscribers', {
        email,
        subscribed_at: new Date().toISOString(),
        status: 'active',
      });
    }

    await sendEmail({
      to: email,
      subject: "Sanliurfa.com Bültenine Hoşgeldiniz!",
      html: `<p>Bültenimize abone olduğunuz için teşekkür ederiz. Şanlıurfa’daki etkinlikler, mekanlar ve haberlerden ilk siz haberdar olacaksınız.</p>
<p><a href="${process.env.PUBLIC_APP_URL || 'https://sanliurfa.com'}/newsletter/unsubscribe?email=${encodeURIComponent(email)}">Abonelikten çıkmak için tıklayın</a></p>`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bültenimize başarıyla abone oldunuz!'
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
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

    if (!email) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'E-posta adresi gereklidir',
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
