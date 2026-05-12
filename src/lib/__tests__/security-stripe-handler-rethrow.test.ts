/**
 * Security Regression Lock — Stripe Webhook Handler Re-throw
 *
 * 2026-04-25 audit'inde `webhooks/stripe.ts` handler'lar try/catch'te error log'luyor
 * sonra silent dönüyordu. Outer POST 200 OK dönüyordu → Stripe asla retry tetiklemiyordu.
 * Sonuç: DB down sırasında user ödedi ama DB'de subscription yok.
 *
 * CLAUDE.md HARD RULE #7: Handler error'u re-throw etmeli, outer POST 5xx döndürmeli
 * (Stripe retry için). Idempotency check'ler retry'ı safe yapar.
 *
 * Bu test STATIC GUARD: Stripe handler'larında catch block'larda `throw error`
 * ifadesinin bulunduğunu doğrular.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const STRIPE_WEBHOOK_FILE = 'src/pages/api/webhooks/stripe.ts';

describe('Security Regression Lock — Stripe webhook handler re-throw', () => {
  it('webhook handlers re-throw errors (no silent swallow)', async () => {
    const fullPath = join(process.cwd(), STRIPE_WEBHOOK_FILE);
    const content = await readFile(fullPath, 'utf-8');

    // Tüm handler function'lar (handleCheckoutSessionCompleted, handleInvoicePaid,
    // handleCustomerSubscriptionDeleted) catch block'ta `throw error` yapmalı.
    const handlerNames = [
      'handleCheckoutSessionCompleted',
      'handleInvoicePaid',
      'handleCustomerSubscriptionDeleted',
    ];

    for (const handlerName of handlerNames) {
      // Handler function'unun bulunduğu yeri tespit et
      const fnStart = content.indexOf(`async function ${handlerName}`);
      expect(fnStart, `Handler ${handlerName} not found in ${STRIPE_WEBHOOK_FILE}`).toBeGreaterThan(-1);

      // Handler'ın sonrasındaki ilk function veya export'a kadar olan kısımı al
      const nextFnStart = content.indexOf('async function ', fnStart + 1);
      const nextExportStart = content.indexOf('export const ', fnStart + 1);
      const fnEnd = Math.min(
        nextFnStart === -1 ? content.length : nextFnStart,
        nextExportStart === -1 ? content.length : nextExportStart,
      );
      const fnBody = content.slice(fnStart, fnEnd);

      // Handler içinde catch block'ta throw zorunlu
      const hasCatchWithThrow = /catch\s*\([^)]*\)\s*\{[\s\S]*?throw\s+(error|err)/.test(fnBody);
      expect(
        hasCatchWithThrow,
        `${handlerName} must re-throw errors in catch block (else Stripe never retries on transient failures)`,
      ).toBe(true);
    }
  });

  it('outer POST has separate signature vs handler try-catch (4xx vs 5xx semantics)', async () => {
    const fullPath = join(process.cwd(), STRIPE_WEBHOOK_FILE);
    const content = await readFile(fullPath, 'utf-8');

    // Outer POST function
    const postStart = content.indexOf('export const POST');
    expect(postStart).toBeGreaterThan(-1);
    const postBody = content.slice(postStart);

    // Signature verification → 400 (no retry)
    expect(postBody, 'POST handler must return 400 on signature verification failure').toMatch(
      /status:\s*400[\s\S]{0,500}signature/i,
    );

    // Handler failure → 500 (Stripe retry)
    expect(postBody, 'POST handler must return 500 on handler failure (Stripe retry)').toMatch(
      /status:\s*500[\s\S]{0,500}(retry|handler)/i,
    );
  });
});
