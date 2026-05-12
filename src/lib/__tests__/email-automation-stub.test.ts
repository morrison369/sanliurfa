/**
 * Unit Tests — email/automation.ts EmailAutomation stub
 *
 * - createRule (id randomBytes hex 12-char + Map storage)
 * - getRule (kayıtlı id → rule, bilinmeyen → undefined)
 * - listRules (Array.from values)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import { emailAutomation, EmailAutomation } from '../email/automation';

describe('EmailAutomation', () => {
  it('createRule — id eklenir + Map storage', () => {
    const r = emailAutomation.createRule({
      name: 'welcome',
      trigger: 'user_register',
      action: 'send_welcome_email',
      enabled: true,
    });
    expect(r.id).toBeDefined();
    expect(r.id.length).toBe(12); // randomBytes(6).toString('hex') = 12 char
    expect(r.name).toBe('welcome');
    expect(r.enabled).toBe(true);
  });

  it('getRule — kayıtlı id → rule döner', () => {
    const r = emailAutomation.createRule({
      name: 'test',
      trigger: 't',
      action: 'a',
      enabled: false,
    });
    expect(emailAutomation.getRule(r.id)?.id).toBe(r.id);
  });

  it('getRule — bilinmeyen id → undefined', () => {
    expect(emailAutomation.getRule('non-existent')).toBeUndefined();
  });

  it('listRules — Array.from values (count >= 1)', () => {
    emailAutomation.createRule({ name: 'list-1', trigger: 't', action: 'a', enabled: true });
    const list = emailAutomation.listRules();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('createRule — her çağrı unique id üretir (randomBytes)', () => {
    const r1 = emailAutomation.createRule({ name: 'a', trigger: 't', action: 'a', enabled: true });
    const r2 = emailAutomation.createRule({ name: 'b', trigger: 't', action: 'a', enabled: true });
    expect(r1.id).not.toBe(r2.id);
  });

  it('new EmailAutomation() — fresh instance ayrı state', () => {
    const fresh = new EmailAutomation();
    expect(fresh.listRules()).toEqual([]);
  });
});
