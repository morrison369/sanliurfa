/**
 * Unit Tests — data/data-governance.ts singleton class managers (Phase 30)
 *
 * - DataClassifier (sensitive field pattern → restricted, default → internal/public)
 * - PIIDetector (email/phone/TC ID/IBAN/credit card regex; detect/contains/redact)
 * - DataMasker (full/partial/hash/tokenize masking strategies)
 *
 * KVKK/GDPR compliance kritik — PII detection + masking yanlış davranırsa data leak.
 */

import { describe, it, expect } from 'vitest';
import {
  dataClassifier,
  piiDetector,
  dataMasker,
} from '../data/data-governance';

describe('DataClassifier', () => {
  it('classifyField — "email" → restricted + piiType email', () => {
    const field = dataClassifier.classifyField('user_email');
    expect(field.sensitivity).toBe('restricted');
    expect(field.piiType).toBe('email');
  });

  it('classifyField — "password" → restricted', () => {
    expect(dataClassifier.classifyField('password').piiType).toBe('password');
  });

  it('classifyField — "phone" → restricted', () => {
    expect(dataClassifier.classifyField('phoneNumber').piiType).toBe('phone');
  });

  it('classifyField — "ssn" → restricted', () => {
    expect(dataClassifier.classifyField('ssn').piiType).toBe('ssn');
  });

  it('classifyField — "creditcard" → restricted', () => {
    expect(dataClassifier.classifyField('creditcardNumber').piiType).toBe('creditcard');
  });

  it('classifyField — "token" → restricted', () => {
    expect(dataClassifier.classifyField('apiToken').piiType).toBe('token');
  });

  it('classifyField — "key" → restricted (api_key)', () => {
    expect(dataClassifier.classifyField('api_key').piiType).toBe('api_key');
  });

  it('classifyField — "secret" → restricted', () => {
    expect(dataClassifier.classifyField('secret').piiType).toBe('secret');
  });

  it('classifyField — "public" içeren → public sensitivity', () => {
    expect(dataClassifier.classifyField('public_data').sensitivity).toBe('public');
  });

  it('classifyField — bilinmeyen → internal default', () => {
    expect(dataClassifier.classifyField('arbitraryField').sensitivity).toBe('internal');
  });

  it('classifyField — case-insensitive (EMAIL → restricted)', () => {
    expect(dataClassifier.classifyField('EMAIL').piiType).toBe('email');
  });

  it('classifyObject — multiple field classify', () => {
    const obj = { email: 'a@b.com', name: 'X', password: 'secret' };
    const classified = dataClassifier.classifyObject(obj);
    expect(classified.email.sensitivity).toBe('restricted');
    expect(classified.password.sensitivity).toBe('restricted');
    expect(classified.name.sensitivity).toBe('internal');
  });

  it('getSensitivityLevel — en yüksek seviye döner', () => {
    const level = dataClassifier.getSensitivityLevel([
      { name: 'a', sensitivity: 'public' },
      { name: 'b', sensitivity: 'restricted' },
      { name: 'c', sensitivity: 'internal' },
    ]);
    expect(level).toBe('restricted');
  });

  it('getSensitivityLevel — boş → public default', () => {
    expect(dataClassifier.getSensitivityLevel([])).toBe('public');
  });
});

describe('PIIDetector — regex patterns', () => {
  it('detect — email match', () => {
    const matches = piiDetector.detect('Contact me at user@example.com please');
    expect(matches.some((m) => m.type === 'email' && m.match === 'user@example.com')).toBe(true);
  });

  it('detect — Türkiye phone number', () => {
    const matches = piiDetector.detect('Call +90 532 123 4567');
    expect(matches.some((m) => m.type === 'phone')).toBe(true);
  });

  it('detect — TC ID (11 hane)', () => {
    const matches = piiDetector.detect('TC: 12345678901');
    expect(matches.some((m) => m.type === 'tc_id')).toBe(true);
  });

  it('detect — IBAN TR formatı', () => {
    const matches = piiDetector.detect('IBAN TR123456789012345678901234');
    expect(matches.some((m) => m.type === 'iban')).toBe(true);
  });

  it('detect — credit card 13-19 digits', () => {
    const matches = piiDetector.detect('Card 4532015112830366');
    expect(matches.some((m) => m.type === 'creditcard')).toBe(true);
  });

  it('detect — boş text → boş array', () => {
    expect(piiDetector.detect('')).toEqual([]);
  });

  it('detect — match start/end position doğru', () => {
    const matches = piiDetector.detect('PRE user@x.com POST');
    const email = matches.find((m) => m.type === 'email');
    expect(email?.start).toBe(4);
    expect(email?.end).toBe(14);
  });

  it('detect — sıralı (start ascending)', () => {
    const matches = piiDetector.detect('email1@x.com text user@y.com');
    if (matches.length >= 2) {
      expect(matches[0].start).toBeLessThan(matches[1].start);
    }
  });

  it('containsPII — true when match', () => {
    expect(piiDetector.containsPII('user@x.com')).toBe(true);
  });

  it('containsPII — false when no match', () => {
    expect(piiDetector.containsPII('hello world')).toBe(false);
  });

  it('redact — PII → [REDACTED]', () => {
    const result = piiDetector.redact('Contact: user@example.com today');
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('user@example.com');
  });

  it('redact — boş text → boş', () => {
    expect(piiDetector.redact('')).toBe('');
  });

  it('redact — multiple PII tümü redact', () => {
    const result = piiDetector.redact('Email user@x.com phone +90 555 1234567');
    expect(result.match(/\[REDACTED\]/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('DataMasker', () => {
  it('mask — config yoksa value olduğu gibi', () => {
    expect(dataMasker.mask('unregistered_field', 'sensitive_value')).toBe('sensitive_value');
  });

  it('mask — full strategy → "**********" max 10 char', () => {
    dataMasker.registerMaskingConfig({ fieldName: 'mask_full', strategy: 'full' });
    expect(dataMasker.mask('mask_full', 'hello world')).toBe('**********');
  });

  it('mask — full strategy → length min(value, 10)', () => {
    dataMasker.registerMaskingConfig({ fieldName: 'mask_full_short', strategy: 'full' });
    expect(dataMasker.mask('mask_full_short', 'abc')).toBe('***');
  });

  it('mask — partial strategy → ilk 2 + *** + son 2', () => {
    dataMasker.registerMaskingConfig({ fieldName: 'mask_partial', strategy: 'partial' });
    expect(dataMasker.mask('mask_partial', 'hello')).toBe('he*lo');
    expect(dataMasker.mask('mask_partial', 'sanliurfa')).toBe('sa*****fa');
  });

  it('mask — partial → length <= 4 → tüm * (kısa string)', () => {
    dataMasker.registerMaskingConfig({ fieldName: 'mask_partial_short', strategy: 'partial' });
    expect(dataMasker.mask('mask_partial_short', 'abcd')).toBe('****');
    expect(dataMasker.mask('mask_partial_short', 'abc')).toBe('***');
  });

  it('mask — hash strategy → "****" prefix + hex', () => {
    dataMasker.registerMaskingConfig({ fieldName: 'mask_hash', strategy: 'hash' });
    const result = dataMasker.mask('mask_hash', 'value');
    expect(result).toMatch(/^\*{4}[0-9a-f]+$/);
  });

  it('mask — tokenize strategy → "TOKEN_" + hex', () => {
    dataMasker.registerMaskingConfig({ fieldName: 'mask_token', strategy: 'tokenize' });
    const result = dataMasker.mask('mask_token', 'value');
    expect(result).toMatch(/^TOKEN_[0-9A-F]+$/);
  });

  it('maskObject — registered field mask, diğeri dokunulmaz', () => {
    dataMasker.registerMaskingConfig({ fieldName: 'sensitive_field', strategy: 'full' });
    const obj = { sensitive_field: 'secret123', name: 'Ali' };
    const masked = dataMasker.maskObject(obj, ['sensitive_field']);
    expect(masked.sensitive_field).toBe('*********'); // 9 char (full = min(9, 10) = 9)
    expect(masked.name).toBe('Ali'); // dokunulmaz
  });

  it('maskObject — non-string field skip', () => {
    dataMasker.registerMaskingConfig({ fieldName: 'numeric_field', strategy: 'full' });
    const obj = { numeric_field: 12345, other: 'x' };
    const masked = dataMasker.maskObject(obj, ['numeric_field']);
    expect(masked.numeric_field).toBe(12345); // sayı dokunulmaz
  });

  it('maskObject — eksik field skip silent', () => {
    const obj = { x: 'value' };
    expect(() => dataMasker.maskObject(obj, ['non_existent'])).not.toThrow();
  });
});
