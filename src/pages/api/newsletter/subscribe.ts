// API: Newsletter subscription (PostgreSQL)
import type { APIRoute } from 'astro';
import { queryOne, insert } from '../../../lib/postgres';
import { getWelcomeEmailHTML, sendEmail } from '../../../lib/email';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();
    const normalizedEmail = email?.toString().trim().toLowerCase();

    if (!normalizedEmail) {
      return new Response(
        JSON.stringify({ error: 'E-posta adresi gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: 'Geçerli bir e-posta adresi girin' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already subscribed
    const existing = await queryOne(
      'SELECT id, status FROM newsletter_subscribers WHERE email = $1',
      [normalizedEmail]
    );

    if (existing && existing.status === 'active') {
      return new Response(
        JSON.stringify({ error: 'Bu e-posta adresi zaten kayıtlı' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
        email: normalizedEmail,
        subscribed_at: new Date().toISOString(),
        status: 'active',
      });
    }

    const displayName = normalizedEmail.split('@')[0] || 'Değerli abonemiz';
    const welcomeEmailSent = await sendEmail({
      to: normalizedEmail,
      subject: 'Şanlıurfa.com bültenine hoş geldiniz',
      html: getWelcomeEmailHTML(displayName)
    });

    if (!welcomeEmailSent) {
      logger.warn('Newsletter welcome email could not be sent', { email: normalizedEmail });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bültenimize başarıyla abone oldunuz!'
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Newsletter subscription error:', err);
    return new Response(
      JSON.stringify({ error: 'Bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Unsubscribe
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'E-posta adresi gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
    console.error('Unsubscribe error:', err);
    return new Response(
      JSON.stringify({ error: 'Bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
