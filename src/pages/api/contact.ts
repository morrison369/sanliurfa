// API: İletişim formu (PostgreSQL)
import type { APIRoute } from 'astro';
import { insert } from '../../lib/postgres';
import { sendEmail } from '../../lib/email';

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

    // Send notification email to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@sanliurfa.com';
    await sendEmail({
      to: adminEmail,
      subject: `[İletişim] ${subject}`,
      html: `
        <h2>Yeni İletişim Formu Mesajı</h2>
        <p><b>Gönderen:</b> ${name} (${email})</p>
        <p><b>Konu:</b> ${subject}</p>
        <p><b>Mesaj:</b></p>
        <blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0;">
          ${message.replace(/\n/g, '<br>')}
        </blockquote>
      `
    });

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: 'Mesajınız alındı - Şanlıurfa.com',
      html: `
        <h2>Mesajınız alındı!</h2>
        <p>Merhaba ${name},</p>
        <p>İletişim formu aracılığıyla gönderdiğiniz mesajı aldık. En kısa sürede size dönüş yapacağız.</p>
        <p>Saygılarımızla,<br>Şanlıurfa.com Ekibi</p>
      `
    });

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
