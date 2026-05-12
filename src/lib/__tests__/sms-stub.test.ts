/**
 * Unit Tests — sms.ts (stub)
 *
 * SMS gönderim entegrasyonu yok; helper log'a düşürür ve success döner.
 * Test stub davranışını lock'lar; production'da Twilio/Vonage eklenirse
 * helper güncellenmeli + bu test reflect edecek şekilde refactor.
 */

import { describe, it, expect } from 'vitest';
import { sendSMS } from '../sms';

describe('sendSMS — stub davranışı', () => {
  it('valid input → success:true', async () => {
    const result = await sendSMS({ to: '+905321234567', message: 'Test message' });
    expect(result.success).toBe(true);
  });

  it('boş message → success:true (validation yok)', async () => {
    const result = await sendSMS({ to: '+905321234567', message: '' });
    expect(result.success).toBe(true);
  });

  it('boş to → success:true (validation yok stub)', async () => {
    const result = await sendSMS({ to: '', message: 'X' });
    expect(result.success).toBe(true);
  });

  it('uzun mesaj (1000 char) → success:true', async () => {
    const result = await sendSMS({ to: '+905321234567', message: 'a'.repeat(1000) });
    expect(result.success).toBe(true);
  });

  it('result error field undefined success case', async () => {
    const result = await sendSMS({ to: '+905321234567', message: 'X' });
    expect(result.error).toBeUndefined();
  });

  it('Türkçe karakter destek', async () => {
    const result = await sendSMS({ to: '+905321234567', message: 'Şanlıurfa Göbeklitepe' });
    expect(result.success).toBe(true);
  });
});
