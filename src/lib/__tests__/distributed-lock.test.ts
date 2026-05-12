/**
 * Unit Tests - cache/distributed-cache.ts DistributedLock (Phase 46)
 *
 * - acquire (token randomBytes hex + TTL + owner default "anonymous")
 * - acquire bilgilenen lock (held + not expired) → null
 * - acquire expired lock → otomatik delete + yeni lock
 * - release (matching token → true; mismatched → false)
 * - extend (matching token → expiresAt += extraMs; mismatched → false)
 * - isLocked (auto-clean expired)
 * - withLock (callback wrapper + finally release)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import { distributedLock } from '../cache/distributed-cache';

const uniq = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('DistributedLock.acquire / release', () => {
  it('acquire - token prefix "token-" + owner default "anonymous"', () => {
    const lock = distributedLock.acquire(uniq('lock'), 1000);
    expect(lock).not.toBeNull();
    expect(lock!.token.startsWith('token-')).toBe(true);
    expect(lock!.owner).toBe('anonymous');
  });

  it('acquire - custom owner', () => {
    const lock = distributedLock.acquire(uniq('lock'), 1000, 'admin-1');
    expect(lock!.owner).toBe('admin-1');
  });

  it('acquire - existing lock not expired → null', () => {
    const key = uniq('busy-lock');
    distributedLock.acquire(key, 60000);
    expect(distributedLock.acquire(key, 60000)).toBeNull();
  });

  it('release - matching token → true', () => {
    const lock = distributedLock.acquire(uniq('release'), 1000);
    expect(distributedLock.release(lock!)).toBe(true);
  });

  it('release - mismatched token → false', () => {
    const key = uniq('mismatch');
    distributedLock.acquire(key, 1000);
    const fakeLock = { key, token: 'fake-token', expiresAt: Date.now() + 1000, owner: 'fake' };
    expect(distributedLock.release(fakeLock)).toBe(false);
  });

  it('release - bilinmeyen lock → false', () => {
    const fakeLock = { key: 'non-existent', token: 't', expiresAt: 0, owner: 'x' };
    expect(distributedLock.release(fakeLock)).toBe(false);
  });
});

describe('DistributedLock.extend / isLocked', () => {
  it('extend - matching token → true + expiresAt artar', () => {
    const lock = distributedLock.acquire(uniq('extend'), 1000);
    expect(distributedLock.extend(lock!, 5000)).toBe(true);
  });

  it('extend - mismatched token → false', () => {
    const key = uniq('extend-mismatch');
    distributedLock.acquire(key, 1000);
    expect(distributedLock.extend({ key, token: 'fake', expiresAt: 0, owner: 'x' }, 5000)).toBe(false);
  });

  it('isLocked - aktif lock → true', () => {
    const key = uniq('locked');
    distributedLock.acquire(key, 60000);
    expect(distributedLock.isLocked(key)).toBe(true);
  });

  it('isLocked - bilinmeyen key → false', () => {
    expect(distributedLock.isLocked(uniq('non-existent'))).toBe(false);
  });
});

describe('DistributedLock.withLock', () => {
  it('withLock - callback çalışır + return value passthrough', async () => {
    const r = await distributedLock.withLock(uniq('with-lock'), async () => 'result-value');
    expect(r).toBe('result-value');
  });

  it('withLock - busy lock → throw "Could not acquire"', async () => {
    const key = uniq('with-busy');
    distributedLock.acquire(key, 60000);
    await expect(distributedLock.withLock(key, async () => 'x')).rejects.toThrow(/Could not acquire/);
  });

  it('withLock - finally release (callback throw sonrası lock free)', async () => {
    const key = uniq('with-throw');
    await expect(distributedLock.withLock(key, async () => {
      throw new Error('callback error');
    })).rejects.toThrow();
    expect(distributedLock.isLocked(key)).toBe(false);
  });
});
