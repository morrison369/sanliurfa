/**
 * Security Regression Lock — Internal Endpoint Token Auth Detection
 *
 * 2026-04-25 audit'inde 3 internal endpoint Bearer token doğrulamadan veya
 * env-conditional bypass ile çalışıyordu:
 * - `/api/emails/process` — `if (!authHeader.includes('Bearer '))` herhangi string geçiyordu
 * - `/api/metrics` — `if (expectedToken && ...)` env yoksa bypass
 * - `/api/webhooks/trigger` — anonim erişilebilirdi
 *
 * Hepsi `verifyInternalToken()` helper'ına bağlandı. Bu test STATIC GUARD:
 * - Bilinen internal endpoint'ler `verifyInternalToken` import etmek ve çağırmak zorunda
 * - Yeni internal endpoint manual auth check yazmak yerine helper kullanmak zorunda
 *
 * CLAUDE.md HARD RULE #10 enforce edilir.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const REQUIRED_INTERNAL_ENDPOINTS = [
  'src/pages/api/emails/process.ts',
  'src/pages/api/metrics.ts',
  'src/pages/api/webhooks/trigger.ts',
];

describe('Security Regression Lock — internal endpoint auth', () => {
  for (const endpoint of REQUIRED_INTERNAL_ENDPOINTS) {
    it(`${endpoint} uses verifyInternalToken helper`, async () => {
      const fullPath = join(process.cwd(), endpoint);
      const content = await readFile(fullPath, 'utf-8');

      // Must import verifyInternalToken
      expect(content, `${endpoint} must import verifyInternalToken from auth/internal-token`).toMatch(
        /from\s+['"][^'"]*auth\/internal-token['"]/,
      );

      // Must call verifyInternalToken
      expect(content, `${endpoint} must call verifyInternalToken(request)`).toMatch(
        /verifyInternalToken\(/,
      );

      // Must NOT have manual Bearer string check (insecure pattern)
      const insecurePattern = /authHeader\.includes\(['"]Bearer\s/;
      expect(insecurePattern.test(content), `${endpoint} should NOT have manual Bearer string check (insecure)`).toBe(false);

      // Must NOT have env-conditional bypass: `if (token && headerNotEqual)`
      const conditionalBypass = /if\s*\(\s*expectedToken\s+&&\s+\w+\s+!==/;
      expect(conditionalBypass.test(content), `${endpoint} should NOT have env-conditional bypass`).toBe(false);
    });
  }
});
