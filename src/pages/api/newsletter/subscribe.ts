// API: Newsletter subscription (PostgreSQL)
import type { APIRoute } from 'astro';
import { queryOne, insert } from '../../../lib/postgres';
import { sendEmail } from '../../../lib/email';

const SITE_URL = process.env.SITE_URL || 'https://sanliurfa.com';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'E-posta adresi gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Geçerli bir e-posta adresi girin' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already subscribed
    const existing = await queryOne(
      'SELECT id, status FROM newsletter_subscribers WHERE email = $1',
      [email]
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
        email,
        subscribed_at: new Date().toISOString(),
        status: 'active',
      });
    }

    await sendNewsletterWelcomeEmail(email);

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

async function sendNewsletterWelcomeEmail(email: string): Promise<void> {
  const html = `
    <h1>Şanlıurfa bültenine hoş geldiniz</h1>
    <p>Şanlıurfa.com bültenine aboneliğiniz başarıyla oluşturuldu.</p>
    <p>Şanlıurfa odaklı mekan, etkinlik, gezi ve yerel rehber içeriklerini düzenli olarak paylaşacağız.</p>
    <p><a href="${SITE_URL}/places">Şanlıurfa mekanlarını keşfedin</a></p>
    <p>Abonelikten çıkmak isterseniz site üzerindeki bülten formunu kullanabilirsiniz.</p>
  `;

  try {
    await sendEmail(email, 'Şanlıurfa.com bültenine hoş geldiniz', html);
  } catch (error) {
    console.error('Newsletter welcome email error:', error);
  }
}

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
