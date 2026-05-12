/**
 * Unit Tests - contact/contact-submission.ts submitContactRequest
 *
 * - Required field validation (name + email + subject + message)
 * - CONTACT_TYPES allowlist - bilinmeyen → "general" fallback
 * - Email + name normalize (trim + lowercase email)
 * - HTML escape (< > & " ' chars in templates)
 * - Ticket structure return + adminEmail env-driven default
 *
 * vi.hoisted - postgres + email mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock, sendEmailMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

vi.mock('../email', () => ({
  sendEmail: sendEmailMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  sendEmailMock.mockReset();
  queryMock.mockResolvedValue({ rows: [{ id: 'ticket-1', ticket_number: 'TK-001' }] });
  sendEmailMock.mockResolvedValue({ success: true, tier: 'resend' });
});

import { submitContactRequest } from '../contact/contact-submission';

const baseInput = {
  name: 'Ali Yılmaz',
  email: 'ali@example.com',
  subject: 'Konu',
  message: 'Mesaj içeriği',
};

describe('submitContactRequest validation', () => {
  it('valid input - success + ticket id + ticketNumber', async () => {
    const r = await submitContactRequest(baseInput);
    expect(r.success).toBe(true);
    expect(r.ticket.id).toBe('ticket-1');
    expect(r.ticket.ticketNumber).toBe('TK-001');
    expect(r.message).toContain('başarıyla');
  });

  it('boş name - throw "Zorunlu alanlar eksik"', async () => {
    await expect(submitContactRequest({ ...baseInput, name: '' })).rejects.toThrow(/Zorunlu alanlar eksik/);
  });

  it('boş email - throw', async () => {
    await expect(submitContactRequest({ ...baseInput, email: '' })).rejects.toThrow(/Zorunlu alanlar eksik/);
  });

  it('boş subject - throw', async () => {
    await expect(submitContactRequest({ ...baseInput, subject: '' })).rejects.toThrow(/Zorunlu alanlar eksik/);
  });

  it('boş message - throw', async () => {
    await expect(submitContactRequest({ ...baseInput, message: '' })).rejects.toThrow(/Zorunlu alanlar eksik/);
  });

  it('whitespace-only - trim sonrası boş → throw', async () => {
    await expect(submitContactRequest({ ...baseInput, message: '   ' })).rejects.toThrow(/Zorunlu alanlar eksik/);
  });
});

describe('CONTACT_TYPES allowlist', () => {
  it('valid type "business_inquiry" - kullanılır', async () => {
    await submitContactRequest({ ...baseInput, type: 'business_inquiry' });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1]).toContain('business_inquiry');
  });

  it('bilinmeyen type → "general" fallback', async () => {
    await submitContactRequest({ ...baseInput, type: 'invalid-type' as any });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1]).toContain('general');
  });

  it('null type → "general"', async () => {
    await submitContactRequest({ ...baseInput, type: null });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1]).toContain('general');
  });
});

describe('email normalization + HTML escape', () => {
  it('email lowercase + trim', async () => {
    await submitContactRequest({ ...baseInput, email: '  Ali@EXAMPLE.com  ' });
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1]).toContain('ali@example.com');
  });

  it('HTML escape - <script> → &lt;script&gt;', async () => {
    await submitContactRequest({ ...baseInput, message: '<script>alert(1)</script>' });
    const emailCall = sendEmailMock.mock.calls[0][0];
    expect(emailCall.html).not.toContain('<script>');
    expect(emailCall.html).toContain('&lt;script&gt;');
  });

  it('HTML escape - quote " → &quot;', async () => {
    await submitContactRequest({ ...baseInput, name: 'Ali "Hacker" Yılmaz' });
    const emailCall = sendEmailMock.mock.calls[0][0];
    expect(emailCall.html).toContain('&quot;');
  });

  it('admin email subject - "[Destek] " prefix + ticket number', async () => {
    await submitContactRequest(baseInput);
    const emailCall = sendEmailMock.mock.calls[0][0];
    expect(emailCall.subject).toContain('[Destek]');
    expect(emailCall.subject).toContain('TK-001');
  });
});

describe('email send fail - non-fatal', () => {
  it('sendEmail success false → ticket yine oluşur (non-fatal warning)', async () => {
    sendEmailMock.mockResolvedValueOnce({ success: false, error: 'SMTP fail' });
    const r = await submitContactRequest(baseInput);
    expect(r.success).toBe(true);
    expect(r.ticket.id).toBe('ticket-1');
  });
});
