/**
 * Submission Notification Emails
 *
 * Audit Priority #5 (öneri raporu): place + event submission flow için email.
 * Mevcut akış: place_submissions + event_submissions tablolarına yazılıyor ama
 * kullanıcı hiçbir bildirim almıyor.
 *
 * Bu modül 4 email template + send helper sağlar:
 *   - notifyPlaceSubmissionReceived(email, name, placeName)
 *   - notifyPlaceSubmissionDecision(email, name, placeName, approved, adminNote?)
 *   - notifyEventSubmissionReceived(email, name, eventTitle)
 *   - notifyEventSubmissionDecision(email, name, eventTitle, approved, adminNote?)
 *
 * Implementation: best-effort (catch + logger.warn), API request latency'ye etki etmez.
 * Email gönderim hatası submission flow'u kırmaz.
 */
import { sendEmail } from './index';
import { logger } from '../logging';

const BRAND = 'Sanliurfa.com';
const FROM_FALLBACK = 'no-reply@sanliurfa.com';

function shellHtml(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:24px;background:#FBF6EC;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1F1410">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid rgba(192,87,31,0.14)">
    <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#C0571F;margin:0 0 16px">${BRAND}</h1>
    ${content}
    <hr style="border:0;border-top:1px solid rgba(192,87,31,0.14);margin:32px 0 16px">
    <p style="font-size:12px;color:#7A6B58;margin:0">Bu email Sanliurfa.com sisteminden otomatik gönderildi. İletişim: <a href="https://sanliurfa.com/iletisim" style="color:#C0571F">iletisim formu</a></p>
  </div>
</body></html>`;
}

export async function notifyPlaceSubmissionReceived(
  email: string,
  name: string,
  placeName: string,
): Promise<void> {
  try {
    const html = shellHtml(
      `<p style="font-size:16px;margin:0 0 16px">Sayın ${name},</p>
       <p style="line-height:1.6;margin:0 0 16px"><strong>${placeName}</strong> işletme başvurunuz alındı.</p>
       <p style="line-height:1.6;margin:0 0 16px">Admin ekibimiz başvurunuzu 1-3 iş günü içinde inceleyecek. Onaylanan işletmeler <a href="https://sanliurfa.com/mekanlar" style="color:#C0571F">sanliurfa.com/mekanlar</a> sayfasında listelenir.</p>
       <p style="line-height:1.6;margin:0">Teşekkürler,<br><strong>${BRAND}</strong></p>`,
      'İşletme başvurunuz alındı',
    );
    await sendEmail({
      to: email,
      from: process.env.EMAIL_FROM || FROM_FALLBACK,
      subject: `${BRAND} — İşletme başvurunuz alındı: ${placeName}`,
      html,
    });
  } catch (err) {
    logger.warn('Place submission notification failed', { email, placeName, error: err instanceof Error ? err.message : String(err) });
  }
}

export async function notifyPlaceSubmissionDecision(
  email: string,
  name: string,
  placeName: string,
  approved: boolean,
  adminNote?: string,
): Promise<void> {
  try {
    const isApproved = approved;
    const subject = isApproved
      ? `🎉 ${placeName} onaylandı — ${BRAND}`
      : `${placeName} için başvuru sonucu — ${BRAND}`;
    const body = isApproved
      ? `<p style="font-size:16px;margin:0 0 16px">Sayın ${name},</p>
         <p style="line-height:1.6;margin:0 0 16px">🎉 <strong>${placeName}</strong> işletme başvurunuz <strong style="color:#2C7A52">onaylandı</strong>.</p>
         <p style="line-height:1.6;margin:0 0 16px">İşletmeniz artık <a href="https://sanliurfa.com/mekanlar" style="color:#C0571F">Sanliurfa.com</a> rehberinde listeleniyor.</p>
         ${adminNote ? `<div style="background:#fdf5e8;border-left:3px solid #C0571F;padding:12px 16px;margin:16px 0;font-size:14px;line-height:1.6"><strong>Admin notu:</strong> ${adminNote}</div>` : ''}
         <p style="margin:24px 0"><a href="https://sanliurfa.com/isletme/panel" style="display:inline-block;padding:12px 24px;background:#C0571F;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">İşletme Paneline Git</a></p>`
      : `<p style="font-size:16px;margin:0 0 16px">Sayın ${name},</p>
         <p style="line-height:1.6;margin:0 0 16px"><strong>${placeName}</strong> işletme başvurunuz şu an için <strong>onaylanmadı</strong>.</p>
         ${adminNote ? `<div style="background:#fde0d8;border-left:3px solid #C0571F;padding:12px 16px;margin:16px 0;font-size:14px;line-height:1.6"><strong>Açıklama:</strong> ${adminNote}</div>` : '<p style="line-height:1.6;margin:0 0 16px">Eksik bilgi, doğrulanamayan veriler veya kategori uyumsuzluğu nedeniyle olabilir.</p>'}
         <p style="line-height:1.6;margin:0 0 16px">İletişim formundan bize ulaşarak detay alabilirsiniz: <a href="https://sanliurfa.com/iletisim" style="color:#C0571F">iletisim</a></p>`;
    await sendEmail({
      to: email,
      from: process.env.EMAIL_FROM || FROM_FALLBACK,
      subject,
      html: shellHtml(body, subject),
    });
  } catch (err) {
    logger.warn('Place decision notification failed', { email, placeName, approved, error: err instanceof Error ? err.message : String(err) });
  }
}

export async function notifyEventSubmissionReceived(
  email: string,
  name: string,
  eventTitle: string,
): Promise<void> {
  try {
    const html = shellHtml(
      `<p style="font-size:16px;margin:0 0 16px">Sayın ${name},</p>
       <p style="line-height:1.6;margin:0 0 16px"><strong>${eventTitle}</strong> etkinlik öneriniz alındı.</p>
       <p style="line-height:1.6;margin:0 0 16px">Admin onayı sonrası <a href="https://sanliurfa.com/etkinlikler" style="color:#C0571F">Etkinlik Takvimi</a>'nde ve şehir takviminde listelenir. Onay süresi 1-3 iş günü.</p>
       <p style="line-height:1.6;margin:0">Teşekkürler,<br><strong>${BRAND}</strong></p>`,
      'Etkinlik öneriniz alındı',
    );
    await sendEmail({
      to: email,
      from: process.env.EMAIL_FROM || FROM_FALLBACK,
      subject: `${BRAND} — Etkinlik öneriniz alındı: ${eventTitle}`,
      html,
    });
  } catch (err) {
    logger.warn('Event submission notification failed', { email, eventTitle, error: err instanceof Error ? err.message : String(err) });
  }
}

export async function notifyEventSubmissionDecision(
  email: string,
  name: string,
  eventTitle: string,
  approved: boolean,
  adminNote?: string,
): Promise<void> {
  try {
    const isApproved = approved;
    const subject = isApproved
      ? `🎉 ${eventTitle} takvime eklendi — ${BRAND}`
      : `${eventTitle} için başvuru sonucu — ${BRAND}`;
    const body = isApproved
      ? `<p style="font-size:16px;margin:0 0 16px">Sayın ${name},</p>
         <p style="line-height:1.6;margin:0 0 16px">🎉 <strong>${eventTitle}</strong> etkinliğiniz <strong style="color:#2C7A52">onaylandı</strong> ve takvime eklendi.</p>
         ${adminNote ? `<div style="background:#fdf5e8;border-left:3px solid #C0571F;padding:12px 16px;margin:16px 0;font-size:14px;line-height:1.6"><strong>Admin notu:</strong> ${adminNote}</div>` : ''}
         <p style="margin:24px 0"><a href="https://sanliurfa.com/etkinlikler" style="display:inline-block;padding:12px 24px;background:#C0571F;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Etkinlik Takvimini Aç</a></p>`
      : `<p style="font-size:16px;margin:0 0 16px">Sayın ${name},</p>
         <p style="line-height:1.6;margin:0 0 16px"><strong>${eventTitle}</strong> etkinlik öneriniz şu an için <strong>onaylanmadı</strong>.</p>
         ${adminNote ? `<div style="background:#fde0d8;border-left:3px solid #C0571F;padding:12px 16px;margin:16px 0;font-size:14px;line-height:1.6"><strong>Açıklama:</strong> ${adminNote}</div>` : '<p style="line-height:1.6;margin:0 0 16px">Eksik bilgi, geçmiş tarih veya kategori uyumsuzluğu nedeniyle olabilir.</p>'}
         <p style="line-height:1.6;margin:0 0 16px">İletişim formundan bize ulaşabilirsiniz.</p>`;
    await sendEmail({
      to: email,
      from: process.env.EMAIL_FROM || FROM_FALLBACK,
      subject,
      html: shellHtml(body, subject),
    });
  } catch (err) {
    logger.warn('Event decision notification failed', { email, eventTitle, approved, error: err instanceof Error ? err.message : String(err) });
  }
}
