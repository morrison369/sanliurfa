import { describe, expect, it } from 'vitest';
import { apiKeyManager as gatewayApiKeyManager } from '../api-gateway';
import { developerPortal as documentationPortal } from '../api-documentation';
import { developerPortal as accountPortal } from '../developer-portal';
import { apiKeyManager as developerApiKeyManager } from '../developer-platform';
import { distributedLock, cacheWarmer } from '../distributed-cache';
import { messageQueue } from '../event-bus';
import { jobQueue } from '../job-queue';
import { getRequestId } from '../api';
import { generateSecurityToken } from '../security-headers';
import { dataMasker } from '../data-governance';

describe('Infrastructure runtime security and id generation', () => {
  it('generates non-Math.random API keys and secrets', () => {
    const gatewayKey = gatewayApiKeyManager.generateKey('user-1', 'Primary', ['read']);
    const portalKey = documentationPortal.createAPIKey('vendor-1', 'Portal Key');
    const developerKey = developerApiKeyManager.generateAPIKey('dev-1', 'SDK Key', 30);
    const account = accountPortal.createAccount({
      email: 'ops@example.com',
      organizationName: 'Ops',
      plan: 'pro'
    });
    const accountKey = accountPortal.generateAPIKey(account.id);

    expect(gatewayKey.key).toMatch(/^sk_[a-f0-9]{48}$/);
    expect(portalKey.id).toMatch(/^key-/);
    expect(portalKey.secret).toMatch(/^secret-[a-f0-9]{48}$/);
    expect(developerKey.keyHash).toMatch(/^sk_[a-f0-9]{48}$/);
    expect(accountKey).toMatch(/^sk_[a-f0-9]{48}$/);
  });

  it('uses deterministic counters for queue-style ids', () => {
    const msgA = messageQueue.enqueue('emails', { subject: 'a' });
    const msgB = messageQueue.enqueue('emails', { subject: 'b' });
    const jobA = jobQueue.enqueue('sync', { id: 1 });
    const jobB = jobQueue.enqueue('sync', { id: 2 });

    expect(msgA).toMatch(/^msg-\d+-\d+$/);
    expect(msgB).toMatch(/^msg-\d+-\d+$/);
    expect(msgA).not.toBe(msgB);
    expect(jobA).toMatch(/^job-\d+-\d+$/);
    expect(jobB).toMatch(/^job-\d+-\d+$/);
    expect(jobA).not.toBe(jobB);
  });

  it('uses safe lock tokens and schedule ids', () => {
    const lock = distributedLock.acquire('sync-key', 1000, 'tester');
    const scheduleA = cacheWarmer.scheduleWarm('users:list', 1000);
    const scheduleB = cacheWarmer.scheduleWarm('users:list', 1000);

    expect(lock?.token).toMatch(/^token-/);
    expect(scheduleA).toBe('schedule-1');
    expect(scheduleB).toBe('schedule-2');

    cacheWarmer.stopSchedule(scheduleA);
    cacheWarmer.stopSchedule(scheduleB);
  });

  it('generates request ids without Math.random fallback', () => {
    const explicit = getRequestId({
      request: new Request('https://example.com', { headers: { 'x-request-id': 'req-existing' } })
    } as any);
    const generated = getRequestId({
      request: new Request('https://example.com')
    } as any);

    expect(explicit).toBe('req-existing');
    expect(generated).toMatch(/^req-/);
    expect(generated).not.toContain('undefined');
  });

  it('generates non-randomized security and tokenized values through controlled helpers', () => {
    const token = generateSecurityToken(24);
    dataMasker.registerMaskingConfig({ fieldName: 'secretField', strategy: 'tokenize' });

    const maskedA = dataMasker.mask('secretField', 'sensitive-value');
    const maskedB = dataMasker.mask('secretField', 'sensitive-value');

    expect(token).toHaveLength(24);
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
    expect(maskedA).toMatch(/^TOKEN_/);
    expect(maskedB).toMatch(/^TOKEN_/);
    expect(maskedA).not.toBe(maskedB);
  });
});
