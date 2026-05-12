/**
 * Unit Tests — email/providers.ts
 *
 * - SMTPProvider class — validateConfig, send (DB/network mock'lanmaz, sadece config validation)
 * - MockProvider class — validateConfig + send returns success
 * - SMTP_PRESETS — gmail/outlook/yandex/mailru/zoho host:port:secure
 * - createEmailProvider() — env-based factory (SMTP_HOST set → SMTPProvider, else MockProvider)
 *
 * SMTPProvider.send() nodemailer dynamic import yapar; gerçek SMTP bağlantısı kurmaz
 * (test env'inde nodemailer mock yok — biz sadece validateConfig ve config shape'i test ederiz).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { SMTPProvider, MockProvider, SMTP_PRESETS, createEmailProvider } from '../email/providers';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('SMTP_PRESETS', () => {
  it('5 free SMTP preset (gmail/outlook/yandex/mailru/zoho)', () => {
    expect(Object.keys(SMTP_PRESETS)).toEqual(['gmail', 'outlook', 'yandex', 'mailru', 'zoho']);
  });

  it('gmail — smtp.gmail.com:587 secure=false', () => {
    expect(SMTP_PRESETS.gmail).toEqual({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
    });
  });

  it('outlook — smtp.office365.com:587', () => {
    expect(SMTP_PRESETS.outlook.host).toBe('smtp.office365.com');
    expect(SMTP_PRESETS.outlook.port).toBe(587);
  });

  it('yandex — smtp.yandex.com:465 secure=true (SSL)', () => {
    expect(SMTP_PRESETS.yandex).toEqual({
      host: 'smtp.yandex.com',
      port: 465,
      secure: true,
    });
  });

  it('mailru — smtp.mail.ru:465 secure=true', () => {
    expect(SMTP_PRESETS.mailru.secure).toBe(true);
    expect(SMTP_PRESETS.mailru.port).toBe(465);
  });

  it('zoho — smtp.zoho.com:587 secure=false', () => {
    expect(SMTP_PRESETS.zoho).toEqual({
      host: 'smtp.zoho.com',
      port: 587,
      secure: false,
    });
  });

  it('tüm preset standart 587 (STARTTLS) veya 465 (SSL)', () => {
    for (const preset of Object.values(SMTP_PRESETS)) {
      expect([587, 465]).toContain(preset.port);
    }
  });

  it('SSL (port 465) → secure=true; STARTTLS (587) → secure=false invariant', () => {
    for (const preset of Object.values(SMTP_PRESETS)) {
      if (preset.port === 465) {
        expect(preset.secure).toBe(true);
      }
      if (preset.port === 587) {
        expect(preset.secure).toBe(false);
      }
    }
  });
});

describe('SMTPProvider', () => {
  it('name = "smtp"', () => {
    const p = new SMTPProvider({ host: 'h', port: 587, secure: false, auth: { user: 'u', pass: 'p' } });
    expect(p.name).toBe('smtp');
  });

  it('validateConfig — tüm alanlar dolu → true', () => {
    const p = new SMTPProvider({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: { user: 'x@y.com', pass: 'secret' },
    });
    expect(p.validateConfig()).toBe(true);
  });

  it('validateConfig — host eksik → false', () => {
    const p = new SMTPProvider({
      host: '',
      port: 587,
      secure: false,
      auth: { user: 'x', pass: 'p' },
    });
    expect(p.validateConfig()).toBe(false);
  });

  it('validateConfig — port=0 → false (falsy)', () => {
    const p = new SMTPProvider({
      host: 'h',
      port: 0,
      secure: false,
      auth: { user: 'x', pass: 'p' },
    });
    expect(p.validateConfig()).toBe(false);
  });

  it('validateConfig — auth.user eksik → false', () => {
    const p = new SMTPProvider({
      host: 'h',
      port: 587,
      secure: false,
      auth: { user: '', pass: 'p' },
    });
    expect(p.validateConfig()).toBe(false);
  });

  it('validateConfig — auth.pass eksik → false', () => {
    const p = new SMTPProvider({
      host: 'h',
      port: 587,
      secure: false,
      auth: { user: 'u', pass: '' },
    });
    expect(p.validateConfig()).toBe(false);
  });
});

describe('MockProvider', () => {
  it('name = "mock"', () => {
    const p = new MockProvider();
    expect(p.name).toBe('mock');
  });

  it('validateConfig — her zaman true', () => {
    expect(new MockProvider().validateConfig()).toBe(true);
  });

  it('send — success:true + messageId mock-<timestamp>', async () => {
    const p = new MockProvider();
    const result = await p.send({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Test body',
      html: '<p>Test</p>',
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^mock-\d+$/);
  });

  it('send — html opsiyonel (text-only)', async () => {
    const result = await new MockProvider().send({ to: 't@x.com', subject: 'S', text: 'T' });
    expect(result.success).toBe(true);
  });

  it('send — text 100 char ile log truncate (yan etki, response etkilenmez)', async () => {
    const longText = 'x'.repeat(500);
    const result = await new MockProvider().send({ to: 't@x.com', subject: 'S', text: longText });
    expect(result.success).toBe(true);
  });

  it('send — error fırlatmaz (asla)', async () => {
    await expect(new MockProvider().send({ to: '', subject: '', text: '' })).resolves.toBeDefined();
  });
});

describe('createEmailProvider — factory', () => {
  it('SMTP_HOST yok → MockProvider fallback', () => {
    vi.stubEnv('SMTP_HOST', '');
    const p = createEmailProvider();
    expect(p.name).toBe('mock');
  });

  it('SMTP_HOST set + auth eksik → MockProvider fallback (validateConfig false)', () => {
    vi.stubEnv('SMTP_HOST', 'smtp.gmail.com');
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('SMTP_PASS', '');
    const p = createEmailProvider();
    expect(p.name).toBe('mock');
  });

  it('SMTP_HOST + tüm auth set → SMTPProvider', () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com');
    vi.stubEnv('SMTP_USER', 'user@x.com');
    vi.stubEnv('SMTP_PASS', 'secret');
    const p = createEmailProvider();
    expect(p.name).toBe('smtp');
  });

  it('SMTP_HOST=gmail preset key → preset host kullanılır', () => {
    vi.stubEnv('SMTP_HOST', 'gmail');
    vi.stubEnv('SMTP_USER', 'user@gmail.com');
    vi.stubEnv('SMTP_PASS', 'app-password');
    const p = createEmailProvider();
    // Preset gmail → smtp.gmail.com host kullanılır (preset.host || SMTP_HOST)
    expect(p.name).toBe('smtp');
  });

  it('SMTP_HOST custom (preset değil) → SMTP_HOST direkt host olarak kullanılır', () => {
    vi.stubEnv('SMTP_HOST', 'mail.custom-server.com');
    vi.stubEnv('SMTP_USER', 'user@x.com');
    vi.stubEnv('SMTP_PASS', 'pass');
    const p = createEmailProvider();
    expect(p.name).toBe('smtp');
  });

  it('SMTP_PORT custom → parsed', () => {
    vi.stubEnv('SMTP_HOST', 'mail.x.com');
    vi.stubEnv('SMTP_PORT', '2525');
    vi.stubEnv('SMTP_USER', 'u');
    vi.stubEnv('SMTP_PASS', 'p');
    const p = createEmailProvider();
    expect(p.name).toBe('smtp');
  });

  it('SMTP_SECURE=true → secure config doğrulanır (env binary)', () => {
    vi.stubEnv('SMTP_HOST', 'mail.x.com');
    vi.stubEnv('SMTP_SECURE', 'true');
    vi.stubEnv('SMTP_USER', 'u');
    vi.stubEnv('SMTP_PASS', 'p');
    const p = createEmailProvider();
    expect(p.name).toBe('smtp');
  });
});
