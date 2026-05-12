/**
 * Unit Tests — email/templates.ts
 *
 * - defaultTemplates: 6 transactional template (welcome/passwordReset/newReview/etc.)
 * - renderTemplate(id, vars): {{var}} placeholder replace + throw if not found
 * - getTemplates() / getTemplate(id): registry lookups
 * - createTemplate(): template factory (in-memory only, DB-bound aşaması yok)
 * - previewTemplate(id): default sample data ile render
 *
 * Note: createTemplate DB write yapmıyor (yorum: "In production, save to database").
 */

import { describe, it, expect } from 'vitest';
import {
  defaultTemplates,
  renderTemplate,
  getTemplates,
  getTemplate,
  createTemplate,
  previewTemplate,
} from '../email/templates';

describe('defaultTemplates', () => {
  it('non-empty registry', () => {
    expect(Object.keys(defaultTemplates).length).toBeGreaterThan(0);
  });

  it('temel transactional template ID kayıtlı', () => {
    expect(defaultTemplates.welcome).toBeDefined();
    expect(defaultTemplates.passwordReset).toBeDefined();
    expect(defaultTemplates.newReview).toBeDefined();
  });

  it('tüm template id/name/subject/htmlBody/textBody alan tam', () => {
    for (const tpl of Object.values(defaultTemplates)) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.subject).toBeTruthy();
      expect(tpl.htmlBody).toBeTruthy();
      expect(tpl.textBody).toBeTruthy();
    }
  });

  it('welcome template Türkçe içerik', () => {
    expect(defaultTemplates.welcome.subject + defaultTemplates.welcome.textBody)
      .toMatch(/[çğıöşüÇĞİÖŞÜ]/);
  });

  it('tüm template id key ile eşleşir (id consistency)', () => {
    for (const [key, tpl] of Object.entries(defaultTemplates)) {
      expect(tpl.id).toBe(key);
    }
  });
});

describe('renderTemplate', () => {
  it('valid template id + vars → 3 alan render (subject/html/text)', () => {
    const result = renderTemplate('welcome', { name: 'Ali', verificationUrl: 'https://x.com/v' });
    expect(result.subject).toBeTruthy();
    expect(result.html).toBeTruthy();
    expect(result.text).toBeTruthy();
  });

  it('placeholder {{name}} → "Ali" replace', () => {
    const result = renderTemplate('welcome', { name: 'Ali Veli', verificationUrl: 'X' });
    // textBody içinde {{name}} placeholder var; render sonrası "Ali Veli" görünmeli
    expect(result.text).toContain('Ali Veli');
  });

  it('eksik variable → placeholder olduğu gibi kalır (literal {{key}})', () => {
    const result = renderTemplate('welcome', {}); // hiç var verilmedi
    // {{name}} hala placeholder olarak yer alır
    expect(result.text).toContain('{{name}}');
  });

  it('partial vars → sadece belirtilenler replace', () => {
    const result = renderTemplate('welcome', { name: 'Mehmet' });
    expect(result.text).toContain('Mehmet');
    expect(result.text).toContain('{{verificationUrl}}'); // verilmedi
  });

  it('bilinmeyen template id → throw', () => {
    expect(() => renderTemplate('non-existent-template', {})).toThrow(/Template not found/);
  });

  it('placeholder URL replace', () => {
    const result = renderTemplate('welcome', {
      name: 'X',
      verificationUrl: 'https://sanliurfa.com/verify/abc',
    });
    expect(result.text).toContain('https://sanliurfa.com/verify/abc');
  });

  it('passwordReset — name + resetUrl + expiresIn replace', () => {
    const result = renderTemplate('passwordReset', {
      name: 'Ahmet',
      resetUrl: 'https://x.com/reset',
      expiresIn: '24',
    });
    expect(result.text).toContain('Ahmet');
    expect(result.text).toContain('https://x.com/reset');
  });

  it('Türkçe karakter destek', () => {
    const result = renderTemplate('welcome', { name: 'Şanlı Ürfa', verificationUrl: 'X' });
    expect(result.text).toContain('Şanlı Ürfa');
  });
});

describe('getTemplates / getTemplate', () => {
  it('getTemplates — array döner', () => {
    const list = getTemplates();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  it('getTemplates — defaultTemplates ile aynı sayı', () => {
    expect(getTemplates()).toHaveLength(Object.keys(defaultTemplates).length);
  });

  it('getTemplate(id) — mevcut id', () => {
    const tpl = getTemplate('welcome');
    expect(tpl?.id).toBe('welcome');
    expect(tpl?.name).toBeTruthy();
  });

  it('getTemplate — bilinmeyen → undefined', () => {
    expect(getTemplate('non-existent')).toBeUndefined();
  });
});

describe('createTemplate', () => {
  it('id otomatik üretilir (custom_<timestamp> format)', () => {
    const tpl = createTemplate({
      name: 'My Custom',
      subject: 'Subject',
      htmlBody: '<p>HTML</p>',
      textBody: 'Text',
      category: 'transactional',
      variables: [],
    });
    expect(tpl.id).toMatch(/^custom_\d+$/);
  });

  it('input field değerleri preserve', () => {
    const input = {
      name: 'My Tpl',
      subject: 'Subject X',
      htmlBody: '<p>HTML body</p>',
      textBody: 'Text body',
      category: 'marketing' as const,
      variables: ['v1', 'v2'],
    };
    const tpl = createTemplate(input);
    expect(tpl.name).toBe('My Tpl');
    expect(tpl.subject).toBe('Subject X');
    expect(tpl.htmlBody).toBe('<p>HTML body</p>');
    expect(tpl.textBody).toBe('Text body');
    expect(tpl.category).toBe('marketing');
    expect(tpl.variables).toEqual(['v1', 'v2']);
  });

  it('iki çağrı farklı id (Date.now() farkı)', async () => {
    const t1 = createTemplate({
      name: 'A', subject: 'S', htmlBody: 'H', textBody: 'T',
      category: 'transactional', variables: [],
    });
    await new Promise((r) => setTimeout(r, 2));
    const t2 = createTemplate({
      name: 'B', subject: 'S', htmlBody: 'H', textBody: 'T',
      category: 'transactional', variables: [],
    });
    expect(t1.id).not.toBe(t2.id);
  });
});

describe('previewTemplate', () => {
  it('welcome — sample data render', () => {
    const result = previewTemplate('welcome');
    expect(result.subject).toBeTruthy();
    expect(result.text).toContain('Ahmet Yılmaz');
  });

  it('passwordReset — Ahmet Yılmaz + 24h sample', () => {
    const result = previewTemplate('passwordReset');
    expect(result.text).toContain('Ahmet Yılmaz');
  });

  it('newReview — Balıklıgöl + Mehmet sample', () => {
    const result = previewTemplate('newReview');
    expect(result.text).toContain('Balıklıgöl');
    expect(result.text).toContain('Mehmet');
  });

  it('weeklyDigest — Ahmet + 1-7 Ocak sample', () => {
    const result = previewTemplate('weeklyDigest');
    expect(result.text).toContain('Ahmet');
  });

  it('placeApproved — Test Mekan sample', () => {
    const result = previewTemplate('placeApproved');
    expect(result.text).toContain('Test Mekan');
  });

  it('accountSecurity — Chrome / Windows sample', () => {
    const result = previewTemplate('accountSecurity');
    expect(result.text).toMatch(/Chrome|Windows/);
  });

  it('bilinmeyen template → throw (renderTemplate üzerinden)', () => {
    expect(() => previewTemplate('non-existent')).toThrow(/Template not found/);
  });
});
