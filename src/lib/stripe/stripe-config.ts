/**
 * Stripe Configuration Resolver
 *
 * Reads Stripe credentials from `site_settings.integrations.payment` (admin-managed)
 * and falls back to environment variables. Cached for 60s to avoid hammering the DB.
 *
 * The cache is invalidated automatically by the TTL; admin saves take effect within 60s
 * without requiring a server restart.
 */

import { queryOne } from '../postgres';

export interface StripeConfig {
  secret_key: string;
  publishable_key: string;
  webhook_secret: string;
}

let _cache: StripeConfig | null = null;
let _cacheAt = 0;

const CACHE_TTL_MS = 60_000;

export async function getStripeConfig(): Promise<StripeConfig> {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL_MS) return _cache;

  let dbValue: Partial<StripeConfig> = {};
  try {
    const row = await queryOne<{ setting_value: Partial<StripeConfig> }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.payment'`,
      [],
    );
    dbValue = row?.setting_value || {};
  } catch {
    dbValue = {};
  }

  _cache = {
    secret_key: dbValue.secret_key || process.env.STRIPE_SECRET_KEY || '',
    publishable_key: dbValue.publishable_key || process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhook_secret: dbValue.webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || '',
  };
  _cacheAt = now;
  return _cache;
}

/**
 * Force-clear the cache. Called by the admin save handler so the next request
 * picks up the new key without waiting for the TTL.
 */
export function invalidateStripeConfigCache(): void {
  _cache = null;
  _cacheAt = 0;
}
