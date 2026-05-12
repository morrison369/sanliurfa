/**
 * Email Service
 *
 * Three-tier transactional email delivery:
 *   1. Resend API (preferred — credentials from /admin/integrations DB, env fallback)
 *   2. SMTP via nodemailer (env-only fallback when Resend isn't configured)
 *   3. Dev log (no real send when neither is configured)
 *
 * Resend config is cached for 60s; admin saves take effect within that window.
 */

import nodemailer from 'nodemailer';
import { getCache, setCache } from '../cache';
import { query, queryOne } from '../postgres';
import { logger } from '../logging';
import { getPublicAppUrl } from '../public-app-url';
import { safeErrorDetail } from '../api';

export interface EmailData {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

const FROM_ADDRESS_FALLBACK = process.env.SMTP_FROM || 'noreply@sanliurfa.com';
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Sanliurfa.com';

// Resend config cache (60s) — admin saves invalidate naturally via TTL.
interface ResendConfig {
  api_key: string;
  from_email: string;
  /** Per-recipient daily send limit. 0 disables rate limiting. Default 10. */
  daily_limit_per_recipient: number;
}
let _resendCache: ResendConfig | null = null;
let _resendCacheAt = 0;
const RESEND_CACHE_TTL_MS = 60_000;

async function getResendConfig(): Promise<ResendConfig> {
  const now = Date.now();
  if (_resendCache && now - _resendCacheAt < RESEND_CACHE_TTL_MS) return _resendCache;
  let dbValue: { api_key?: string; from_email?: string; daily_limit_per_recipient?: number } = {};
  try {
    const row = await queryOne<{
      setting_value: { api_key?: string; from_email?: string; daily_limit_per_recipient?: number };
    }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.email'`,
      [],
    );
    dbValue = row?.setting_value || {};
  } catch {
    dbValue = {};
  }
  // Treat undefined → default 10; negative numbers clamped to 0 (disabled).
  const limitRaw = dbValue.daily_limit_per_recipient;
  const dailyLimit = typeof limitRaw === 'number' && limitRaw >= 0 ? limitRaw : 10;
  _resendCache = {
    api_key: dbValue.api_key || process.env.RESEND_API_KEY || '',
    from_email: dbValue.from_email || FROM_ADDRESS_FALLBACK,
    daily_limit_per_recipient: dailyLimit,
  };
  _resendCacheAt = now;
  return _resendCache;
}

// SMTP config — DB-managed via /admin/integrations, env fallback. Cached for 60s.
interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from_email: string;
}
let _smtpCache: SmtpConfig | null = null;
let _smtpCacheAt = 0;

async function getSmtpConfig(): Promise<SmtpConfig> {
  const now = Date.now();
  if (_smtpCache && now - _smtpCacheAt < RESEND_CACHE_TTL_MS) return _smtpCache;
  let dbValue: Partial<SmtpConfig> = {};
  try {
    const row = await queryOne<{ setting_value: Partial<SmtpConfig> }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.smtp'`,
      [],
    );
    dbValue = row?.setting_value || {};
  } catch {
    dbValue = {};
  }
  _smtpCache = {
    host: dbValue.host || process.env.SMTP_HOST || '',
    port: Number(dbValue.port ?? process.env.SMTP_PORT ?? 587),
    secure: typeof dbValue.secure === 'boolean' ? dbValue.secure : process.env.SMTP_SECURE === 'true',
    user: dbValue.user || process.env.SMTP_USER || '',
    pass: dbValue.pass || process.env.SMTP_PASS || '',
    from_email: dbValue.from_email || FROM_ADDRESS_FALLBACK,
  };
  _smtpCacheAt = now;
  return _smtpCache;
}

async function createSmtpTransport() {
  const cfg = await getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) return null;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

async function sendViaResend(
  data: EmailData,
  config: { api_key: string; from_email: string },
): Promise<{ success: boolean; error?: string }> {
  // Resend API: dev/test/dummy keys trigger 401, fall through to next tier.
  if (config.api_key.includes('dummy') || config.api_key.length < 10) {
    return { success: false, error: 'Resend api_key looks like a dev placeholder' };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${config.from_email}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { success: false, error: `Resend ${response.status}: ${body.slice(0, 200)}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Resend network error' };
  }
}

export type EmailTier = 'resend' | 'smtp' | 'dev-log';
export interface SendEmailResult {
  success: boolean;
  error?: string;
  /** Which delivery tier was actually used. Useful for the admin "Test Et" button so
   *  the operator can see whether Resend or the SMTP fallback handled the message. */
  tier?: EmailTier;
}

/**
 * Send email — tries Resend first, falls back to SMTP, then dev log.
 * The rate limit applies once per call regardless of tier used.
 *
 * The per-recipient daily limit is read from `integrations.email.daily_limit_per_recipient`
 * (admin-managed, default 10). Set to 0 to disable rate limiting (e.g. for transactional
 * burst scenarios where the sender controls volume separately).
 */
export async function sendEmail(data: EmailData): Promise<SendEmailResult> {
  try {
    const resendCfg = await getResendConfig();
    const rateKey = `email:${data.to}`;
    const sentToday = await getCache<number>(rateKey) || 0;

    // Rate limit: 0 means disabled.
    if (resendCfg.daily_limit_per_recipient > 0 && sentToday >= resendCfg.daily_limit_per_recipient) {
      return {
        success: false,
        error: `Email rate limit exceeded (${resendCfg.daily_limit_per_recipient}/day per recipient)`,
      };
    }

    // Tier 1: Resend (admin-managed via /admin/integrations or env)
    if (resendCfg.api_key) {
      const result = await sendViaResend(data, resendCfg);
      if (result.success) {
        await setCache(rateKey, sentToday + 1, 86400);
        logger.info('Email sent via Resend', { to: data.to });
        return { ...result, tier: 'resend' };
      }
      logger.warn(`Resend tier failed: ${result.error}; trying SMTP fallback`);
    }

    // Tier 2: SMTP fallback (DB-managed via /admin/integrations or env)
    const transport = await createSmtpTransport();
    if (transport) {
      const smtpCfg = await getSmtpConfig();
      await transport.sendMail({
        from: `"${FROM_NAME}" <${smtpCfg.from_email || resendCfg.from_email || FROM_ADDRESS_FALLBACK}>`,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        attachments: data.attachments,
      });
      await setCache(rateKey, sentToday + 1, 86400);
      logger.info('Email sent via SMTP', { to: data.to });
      return { success: true, tier: 'smtp' };
    }

    // Tier 3: Dev log only
    logger.info(`📧 [DEV — no email backend] to=${data.to} subject="${data.subject}"`);
    return { success: true, tier: 'dev-log' };
  } catch (error) {
    logger.error('Email send error:', error);
    return { success: false, error: safeErrorDetail(error, 'E-posta gönderilemedi') };
  }
}

/**
 * Probe SMTP transport without sending an email. Used by the admin "Test Et" button.
 * Calls nodemailer's verify() which opens a TCP connection, runs HELO/EHLO + AUTH, then closes.
 * Returns `{ ok }` on success or `{ ok: false, error }` on connect/auth failure.
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string; host?: string }> {
  const cfg = await getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, error: 'SMTP host/user/pass yapılandırılmamış' };
  }
  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
    });
    await transport.verify();
    return { ok: true, host: cfg.host };
  } catch (error) {
    return {
      ok: false,
      host: cfg.host,
      error: safeErrorDetail(error, 'SMTP bağlantısı doğrulanamadı'),
    };
  }
}

/** Force-clear both Resend and SMTP config caches (called by /admin/integrations on save). */
export function invalidateEmailConfigCache(): void {
  _smtpCache = null;
  _smtpCacheAt = 0;
  _resendCache = null;
  _resendCacheAt = 0;
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const html = welcomeTemplate(name);
  const text = `Hoşgeldiniz ${name}! Sanliurfa.com'a üye olduğunuz için teşekkür ederiz.`;
  
  await sendEmail({
    to,
    subject: 'Hoşgeldiniz! Sanliurfa.com',
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${getPublicAppUrl()}/sifre-sifirla?token=${resetToken}`;
  const html = passwordResetTemplate(name, resetUrl);
  
  await sendEmail({
    to,
    subject: 'Şifre Sıfırlama - Sanliurfa.com',
    html,
    text: `Merhaba ${name}, şifrenizi sıfırlamak için bu linke tıklayın: ${resetUrl}`,
  });
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verifyToken: string
): Promise<void> {
  const verifyUrl = `${getPublicAppUrl()}/email-dogrula?token=${verifyToken}`;
  const html = verificationTemplate(name, verifyUrl);
  
  await sendEmail({
    to,
    subject: 'E-posta Doğrulama - Sanliurfa.com',
    html,
    text: `Merhaba ${name}, e-posta adresinizi doğrulamak için bu linke tıklayın: ${verifyUrl}`,
  });
}

/**
 * Send notification email
 */
export async function sendNotificationEmail(
  to: string,
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): Promise<void> {
  const html = notificationTemplate(title, message, actionUrl, actionText);
  
  await sendEmail({
    to,
    subject: title,
    html,
    text: message,
  });
}

// ─── Harran Scripts Email Theme ──────────────────────────────────────────────
// Obsidian bg, copper accent, Cormorant Garamond display / Jost body fallbacks.
// Table-based layout for broad email client compatibility.
const EM = {
  bg: '#0D0A08',
  card: '#1C1410',
  border: '#2E2018',
  heading: '#EDE0C6',
  body: '#C4A882',
  muted: '#7A6B58',
  copper: '#B87333',
  copperHover: '#CE8E38',
  danger: '#C73A47',
  success: '#2A9D8F',
  displayFont: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  bodyFont: "'Jost', 'Gill Sans', Helvetica, Arial, sans-serif",
};

function emailShell(content: string, year = new Date().getFullYear()): string {
  const appUrl = getPublicAppUrl();
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>Şanlıurfa.com</title>
</head>
<body style="margin:0;padding:0;background:${EM.bg};font-family:${EM.bodyFont};color:${EM.body};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" style="max-width:600px;width:100%;background:${EM.card};border:1px solid ${EM.border};border-radius:4px;overflow:hidden;">

        <!-- Brand header -->
        <tr><td style="padding:28px 40px 20px;border-bottom:1px solid ${EM.border};text-align:center;">
          <a href="${appUrl}" style="text-decoration:none;display:inline-block;">
            <span style="font-family:${EM.displayFont};font-size:26px;font-weight:300;font-style:italic;color:${EM.heading};letter-spacing:-0.02em;">Şanlıurfa</span><span style="font-family:${EM.bodyFont};font-size:13px;font-weight:700;color:${EM.copper};letter-spacing:0.08em;">.com</span>
          </a>
        </td></tr>

        <!-- Content -->
        <tr><td style="padding:36px 40px;">${content}</td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px 28px;border-top:1px solid ${EM.border};text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:${EM.muted};">© ${year} Şanlıurfa.com · Tüm hakları saklıdır.</p>
          <p style="margin:0;font-size:11px;color:${EM.muted};">Bu e-postayı almak istemiyorsanız <a href="${appUrl}/ayarlar/bildirimler" style="color:${EM.copper};text-decoration:none;">aboneliğinizi yönetin</a>.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailButton(label: string, href: string, color = EM.copper): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto;">
    <tr><td style="border-radius:3px;background:${color};">
      <a href="${href}" style="display:inline-block;padding:13px 32px;font-family:${EM.bodyFont};font-size:14px;font-weight:600;color:#0D0A08;text-decoration:none;letter-spacing:0.03em;">${label}</a>
    </td></tr>
  </table>`;
}

function emailDivider(): string {
  return `<hr style="border:none;border-top:1px solid ${EM.border};margin:24px 0;">`;
}

// Templates
function welcomeTemplate(name: string): string {
  const content = `
    <h2 style="margin:0 0 20px;font-family:${EM.displayFont};font-size:28px;font-weight:400;font-style:italic;color:${EM.heading};letter-spacing:-0.01em;">Hoş Geldiniz, ${escapeHtml(name)}!</h2>
    <p style="margin:0 0 16px;line-height:1.7;color:${EM.body};">Şanlıurfa.com topluluğuna katıldığınız için teşekkürler. Şehrimizin tarihi dokusunu, eşsiz lezzetlerini ve kültürel zenginliğini birlikte keşfedelim.</p>
    <p style="margin:0 0 24px;line-height:1.7;color:${EM.body};">Tarihi mekanlar, yöresel tarifler, etkinlikler ve daha fazlası sizi bekliyor.</p>
    ${emailButton('Keşfetmeye Başla', `${getPublicAppUrl()}/kesfet`)}
    ${emailDivider()}
    <p style="margin:0;font-size:13px;color:${EM.muted};line-height:1.6;">Sorularınız için <a href="mailto:iletisim@sanliurfa.com" style="color:${EM.copper};text-decoration:none;">iletisim@sanliurfa.com</a> adresine yazabilirsiniz.</p>
  `;
  return emailShell(content);
}

function passwordResetTemplate(name: string, resetUrl: string): string {
  const content = `
    <h2 style="margin:0 0 20px;font-family:${EM.displayFont};font-size:28px;font-weight:400;font-style:italic;color:${EM.heading};">Şifre Sıfırlama</h2>
    <p style="margin:0 0 16px;line-height:1.7;color:${EM.body};">Merhaba <strong style="color:${EM.heading};">${escapeHtml(name)}</strong>,</p>
    <p style="margin:0 0 8px;line-height:1.7;color:${EM.body};">Hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi oluşturabilirsiniz.</p>
    ${emailButton('Şifremi Sıfırla', resetUrl, EM.danger)}
    <div style="background:rgba(199,58,71,0.08);border-left:3px solid ${EM.danger};padding:14px 18px;border-radius:0 3px 3px 0;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#E08090;line-height:1.6;"><strong>Güvenlik Notu:</strong> Bu talebi siz yapmadıysanız bu e-postayı dikkate almayın — hesabınız güvendedir. Link 24 saat geçerlidir.</p>
    </div>
    ${emailDivider()}
    <p style="margin:0;font-size:12px;color:${EM.muted};word-break:break-all;">Buton çalışmıyorsa bu adresi tarayıcınıza yapıştırın:<br><a href="${resetUrl}" style="color:${EM.copper};text-decoration:none;">${resetUrl}</a></p>
  `;
  return emailShell(content);
}

function verificationTemplate(name: string, verifyUrl: string): string {
  const content = `
    <h2 style="margin:0 0 20px;font-family:${EM.displayFont};font-size:28px;font-weight:400;font-style:italic;color:${EM.heading};">E-posta Doğrulama</h2>
    <p style="margin:0 0 16px;line-height:1.7;color:${EM.body};">Merhaba <strong style="color:${EM.heading};">${escapeHtml(name)}</strong>,</p>
    <p style="margin:0 0 8px;line-height:1.7;color:${EM.body};">Hesabınızı aktifleştirmek için e-posta adresinizi doğrulamanız gerekiyor. Aşağıdaki butona tıklayın:</p>
    ${emailButton('E-postamı Doğrula', verifyUrl, EM.success)}
    ${emailDivider()}
    <p style="margin:0;font-size:12px;color:${EM.muted};word-break:break-all;">Buton çalışmıyorsa bu adresi tarayıcınıza yapıştırın:<br><a href="${verifyUrl}" style="color:${EM.copper};text-decoration:none;">${verifyUrl}</a></p>
  `;
  return emailShell(content);
}

function notificationTemplate(
  title: string,
  message: string,
  actionUrl?: string,
  actionText?: string
): string {
  const content = `
    <h2 style="margin:0 0 20px;font-family:${EM.displayFont};font-size:28px;font-weight:400;font-style:italic;color:${EM.heading};">${escapeHtml(title)}</h2>
    <p style="margin:0 0 24px;line-height:1.7;color:${EM.body};">${escapeHtml(message)}</p>
    ${actionUrl ? emailButton(escapeHtml(actionText || 'Görüntüle'), actionUrl) : ''}
  `;
  return emailShell(content);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/**
 * Get password reset email HTML
 */
export function getPasswordResetEmailHTML(name: string, resetUrl: string): string {
  return passwordResetTemplate(name, resetUrl);
}

/**
 * Get welcome email HTML
 */
export function getWelcomeEmailHTML(name: string): string {
  return welcomeTemplate(name);
}

/**
 * Get verification email HTML
 */
export function getVerificationEmailHTML(name: string, verifyUrl: string): string {
  return verificationTemplate(name, verifyUrl);
}


/**
 * Get review response email HTML
 */
export function getReviewResponseEmailHTML(userName: string, placeName: string, responseText: string): string {
  const content = `
    <h2 style="margin:0 0 20px;font-family:${EM.displayFont};font-size:28px;font-weight:400;font-style:italic;color:${EM.heading};">Yorumunuza Yanıt</h2>
    <p style="margin:0 0 12px;line-height:1.7;color:${EM.body};">Merhaba <strong style="color:${EM.heading};">${escapeHtml(userName)}</strong>,</p>
    <p style="margin:0 0 20px;line-height:1.7;color:${EM.body};"><strong style="color:${EM.heading};">${escapeHtml(placeName)}</strong> hakkında yaptığınız yoruma bir yanıt geldi:</p>
    <div style="background:rgba(184,115,51,0.08);border-left:3px solid ${EM.copper};padding:16px 20px;border-radius:0 3px 3px 0;margin-bottom:24px;">
      <p style="margin:0;line-height:1.7;color:${EM.body};font-style:italic;">${escapeHtml(responseText)}</p>
    </div>
    <p style="margin:0;font-size:13px;color:${EM.muted};">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
  `;
  return emailShell(content);
}

/**
 * Send review response email
 */
export async function sendReviewResponseEmail(
  to: string,
  userName: string,
  placeName: string,
  responseText: string
): Promise<void> {
  const html = getReviewResponseEmailHTML(userName, placeName, responseText);
  
  await sendEmail({
    to,
    subject: `${placeName} - Yorumunuza Yanıt`,
    html,
    text: `Merhaba ${userName}, ${placeName} hakkında yaptığınız yoruma yanıt geldi: ${responseText}`,
  });
}


/**
 * Get subscription confirmation email HTML
 */
export function getSubscriptionEmailHTML(newsletterName: string): string {
  const content = `
    <h2 style="margin:0 0 20px;font-family:${EM.displayFont};font-size:28px;font-weight:400;font-style:italic;color:${EM.heading};">Aboneliğiniz Başladı!</h2>
    <p style="margin:0 0 16px;line-height:1.7;color:${EM.body};"><strong style="color:${EM.heading};">${escapeHtml(newsletterName)}</strong> bültenine başarıyla abone oldunuz.</p>
    <p style="margin:0 0 24px;line-height:1.7;color:${EM.body};">Şanlıurfa'nın en güncel haberleri, etkinlikleri ve fırsatları artık size ulaşacak.</p>
    ${emailButton("Blog'a Git", `${getPublicAppUrl()}/blog`)}
  `;
  return emailShell(content);
}

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionEmail(to: string, newsletterName: string): Promise<void> {
  const html = getSubscriptionEmailHTML(newsletterName);
  
  await sendEmail({
    to,
    subject: `${newsletterName} - Aboneliğiniz Başladı`,
    html,
    text: `${newsletterName} bültenine abone oldunuz.`,
  });
}


/**
 * Get email verification HTML
 * Alias for verificationTemplate
 */
export function getEmailVerificationHTML(name: string, verifyUrl: string): string {
  return verificationTemplate(name, verifyUrl);
}


// Email queue interfaces
export interface PendingEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  status: 'pending' | 'sent' | 'failed';
  retryCount: number;
  createdAt: Date;
}

/**
 * Get pending emails from queue
 */
export async function getPendingEmails(limit = 10): Promise<PendingEmail[]> {
  const result = await query(
    `SELECT * FROM email_queue 
     WHERE status = 'pending'
     AND (retry_count < 3 OR retry_count IS NULL)
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    to: row.to_email,
    subject: row.subject,
    html: row.html_content,
    text: row.text_content,
    status: row.status,
    retryCount: row.retry_count || 0,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Add email to queue
 */
export async function queueEmail(data: EmailData): Promise<string> {
  const result = await query(
    `INSERT INTO email_queue (to_email, subject, html_content, text_content, status, retry_count, created_at)
     VALUES ($1, $2, $3, $4, 'pending', 0, NOW())
     RETURNING id`,
    [data.to, data.subject, data.html, data.text || null]
  );
  
  return result.rows[0].id;
}

/**
 * Mark email as sent
 */
export async function markEmailSent(emailId: string): Promise<void> {
  await query(
    `UPDATE email_queue SET status = 'sent', sent_at = NOW() WHERE id = $1`,
    [emailId]
  );
}

/**
 * Mark email as failed
 */
export async function markEmailFailed(emailId: string, error: string): Promise<void> {
  await query(
    `UPDATE email_queue 
     SET status = 'failed', 
         error_message = $2,
         retry_count = COALESCE(retry_count, 0) + 1
     WHERE id = $1`,
    [emailId, error]
  );
}

/**
 * Alias for sendEmail — kept for backward compatibility
 */
export async function sendEmailViaService(data: EmailData): Promise<{ success: boolean; error?: string }> {
  return sendEmail(data);
}


/**
 * Request email verification
 * Creates a verification token and queues the email
 */
export async function requestEmailVerification(userId: string, email: string, name: string): Promise<void> {
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  // Store hash only — DB breach cannot be used to verify emails directly (HARD RULE #46 scope).
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await query(
    `INSERT INTO email_verifications (user_id, token, expires_at, created_at)
     VALUES ($1, $2, NOW() + INTERVAL '24 hours', NOW())`,
    [userId, tokenHash]
  );

  const verifyUrl = `${getPublicAppUrl()}/email-dogrula?token=${token}`;
  
  // Queue verification email
  const html = getVerificationEmailHTML(name, verifyUrl);
  await queueEmail({
    to: email,
    subject: 'E-posta Doğrulama - Sanliurfa.com',
    html,
    text: `Merhaba ${name}, e-posta adresinizi doğrulamak için bu linke tıklayın: ${verifyUrl}`,
  });
}

/**
 * Check if email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const result = await query(
    `SELECT email_verified FROM users WHERE id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) return false;
  return result.rows[0].email_verified === true;
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const crypto = await import('crypto');
  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const result = await query(
    `SELECT user_id FROM email_verifications
     WHERE token = $1 AND used = false AND expires_at > NOW()`,
    [tokenHash]
  );
  
  if (result.rows.length === 0) return false;
  
  const userId = result.rows[0].user_id;
  
  // Mark user as verified
  await query(
    `UPDATE users SET email_verified = true WHERE id = $1`,
    [userId]
  );
  
  // Mark token as used
  await query(
    `UPDATE email_verifications SET used = true WHERE token = $1`,
    [token]
  );
  
  return true;
}


/**
 * Verify email with token (alias)
 */
export async function verifyEmailWithToken(token: string): Promise<boolean> {
  return verifyEmail(token);
}

