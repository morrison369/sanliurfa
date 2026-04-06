// API: İletişim formu (PostgreSQL)
import type { APIRoute } from 'astro';
import { insert } from '../../lib/postgres';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString();
    const subject = formData.get('subject')?.toString();
    const message = formData.get('message')?.toString();

    // Validation
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Tüm alanları doldurun' }),
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

    // Save to database
    await insert('contact_messages', {
      name,
      email,
      subject,
      message,
      status: 'new',
      created_at: new Date().toISOString(),
    });

    // TODO: Send notification email to admin (Resend API key gerekli)
    // TODO: Send confirmation email to user

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.' 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Contact form error:', err);
    return new Response(
      JSON.stringify({ error: 'Mesaj gönderilirken bir hata oluştu' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
