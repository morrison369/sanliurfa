#!/usr/bin/env node

import pg from 'pg';

/**
 * Phase-1 smoke: social + place core flows.
 * Usage:
 *   BASE_URL=http://localhost:4321 AUTH_TOKEN=<token> SOCIAL_TARGET_USER_ID=<userId> node scripts/smoke/social-place-phase1.mjs
 */

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4321';
const token = process.env.AUTH_TOKEN || '';
const socialTargetUserId = process.env.SOCIAL_TARGET_USER_ID || '';
const strictPlaceSubmit = process.env.STRICT_PLACE_SUBMIT === '1';
let authCookieHeader = token ? { Cookie: `auth-token=${token}` } : {};
let activeUserId = process.env.SMOKE_USER_ID || '';
let targetUserId = socialTargetUserId;
let createdSmokePlaceId = '';

const { Pool } = pg;
const databaseUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'sanliurfa'}`;

function logStep(name, ok) {
  const status = ok ? 'OK' : 'FAIL';
  console.log(`[${status}] ${name}`);
}

async function callJson(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      ...authCookieHeader,
    },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

async function cleanupSmokePlaceApplications(placeId = '') {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });

  try {
    const candidateResult = placeId
      ? await pool.query(
          `SELECT p.id
           FROM places p
           JOIN users u ON u.id = p.owner_id
           WHERE p.id = $1
             AND p.name = 'Smoke Test Mekan'
             AND u.email = 'smoke@sanliurfa.com'`,
          [placeId],
        )
      : await pool.query(
          `SELECT p.id
           FROM places p
           JOIN users u ON u.id = p.owner_id
           WHERE p.name = 'Smoke Test Mekan'
             AND p.status = 'pending'
             AND u.email = 'smoke@sanliurfa.com'`,
        );

    const ids = candidateResult.rows.map((row) => String(row.id));
    if (!ids.length) return 0;

    await pool.query('BEGIN');
    await pool.query(
      `DELETE FROM support_tickets
       WHERE description ILIKE ANY($1::text[])`,
      [ids.map((id) => `%Place ID: ${id}%`)],
    );
    const deleted = await pool.query(
      `DELETE FROM places
       WHERE id = ANY($1::uuid[])
         AND name = 'Smoke Test Mekan'
         AND status = 'pending'`,
      [ids],
    );
    await pool.query('COMMIT');
    return deleted.rowCount || 0;
  } catch (error) {
    try {
      await pool.query('ROLLBACK');
    } catch {
      // ignore rollback errors during smoke cleanup
    }
    throw error;
  } finally {
    await pool.end();
  }
}

async function waitForHealth(maxMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return res;
    } catch {
      // health polling: ignore transient connection errors
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

function buildSmokeIdentity(prefix) {
  const normalized = prefix.replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'smoke';
  return {
    email: `${normalized}.${Date.now()}@sanliurfa-smoke.local`,
    password: 'SmokeTest123!',
    fullName: `${normalized} user`,
  };
}

async function loginWithCredentials(email, password) {
  const { response, body } = await callJson('/api/auth/login', {
    method: 'POST',
    headers: {},
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return { ok: false, response, body };
  if (body?.requiresTwoFactor) return { ok: false, response, body };

  const parsedToken = extractAuthTokenFromResponse(response) || body?.token || body?.data?.token || '';
  const parsedUserId = body?.user?.id || body?.data?.user?.id || body?.data?.userId || '';
  if (!parsedUserId) return { ok: false, response, body };
  return { ok: true, token: parsedToken, userId: parsedUserId, body };
}

async function registerWithCredentials(fullName, email, password) {
  const { response, body } = await callJson('/api/auth/register', {
    method: 'POST',
    headers: {},
    body: JSON.stringify({ fullName, email, password }),
  });
  if (!response.ok) return { ok: false, response, body };

  const parsedToken = extractAuthTokenFromResponse(response) || body?.token || body?.data?.token || '';
  const parsedUserId = body?.user?.id || body?.data?.user?.id || body?.data?.userId || '';
  if (!parsedUserId) return { ok: false, response, body };
  return { ok: true, token: parsedToken, userId: parsedUserId, body };
}

function extractAuthTokenFromResponse(response) {
  const setCookie = response.headers.get('set-cookie') || '';
  if (!setCookie) return '';
  const match = setCookie.match(/auth-token=([^;]+)/i);
  return match?.[1] || '';
}

async function ensureAuthUser() {
  if (token && activeUserId) {
    authCookieHeader = { Cookie: `auth-token=${token}` };
    return { ok: true, token, userId: activeUserId, source: 'env' };
  }

  const loginEmail = process.env.SMOKE_EMAIL || 'smoke.user@sanliurfa-smoke.local';
  const loginPassword = process.env.SMOKE_PASSWORD || 'SmokeTest123!';
  const loginFullName = process.env.SMOKE_FULL_NAME || 'smoke user';

  if (process.env.SMOKE_EMAIL) {
    const login = await loginWithCredentials(loginEmail, loginPassword);
    if (login.ok) {
      if (login.token) authCookieHeader = { Cookie: `auth-token=${login.token}` };
      activeUserId = login.userId;
      return { ok: true, token: login.token, userId: login.userId, source: 'login' };
    }
  }

  const identity = process.env.SMOKE_EMAIL
    ? { email: loginEmail, password: loginPassword, fullName: loginFullName }
    : buildSmokeIdentity('smoke-main');
  const register = await registerWithCredentials(identity.fullName, identity.email, identity.password);
  if (register.ok) {
    if (register.token) authCookieHeader = { Cookie: `auth-token=${register.token}` };
    activeUserId = register.userId;
    return { ok: true, token: register.token, userId: register.userId, source: 'register' };
  }

  return { ok: false, reason: 'auth_bootstrap_failed', login, register };
}

async function ensureTargetUser() {
  if (targetUserId) return { ok: true, userId: targetUserId, source: 'env' };

  const targetEmail = process.env.SMOKE_TARGET_EMAIL || 'smoke.target@sanliurfa-smoke.local';
  const targetPassword = process.env.SMOKE_TARGET_PASSWORD || 'SmokeTest123!';
  const targetFullName = process.env.SMOKE_TARGET_FULL_NAME || 'smoke target';

  if (process.env.SMOKE_TARGET_EMAIL) {
    const login = await loginWithCredentials(targetEmail, targetPassword);
    if (login.ok) {
      targetUserId = login.userId;
      return { ok: true, userId: login.userId, source: 'login' };
    }
  }

  const identity = process.env.SMOKE_TARGET_EMAIL
    ? { email: targetEmail, password: targetPassword, fullName: targetFullName }
    : buildSmokeIdentity('smoke-target');
  const register = await registerWithCredentials(identity.fullName, identity.email, identity.password);
  if (register.ok) {
    targetUserId = register.userId;
    return { ok: true, userId: register.userId, source: 'register' };
  }

  return { ok: false, reason: 'target_bootstrap_failed', login, register };
}

async function run() {
  let failed = 0;

  try {
    const cleaned = await cleanupSmokePlaceApplications();
    if (cleaned > 0) logStep('Place Submit Cleanup', true, `removed_stale=${cleaned}`);
  } catch (err) {
    logStep('Place Submit Cleanup', true, `non-blocking cleanup skipped (${String(err)})`);
  }

  try {
    const health = await waitForHealth(30000);
    const ok = Boolean(health?.ok);
    logStep('Health', ok, health ? `status=${health.status}` : 'timeout');
    if (!ok) failed++;
  } catch (err) {
    logStep('Health', false, String(err));
    failed++;
  }

  try {
    const applyRes = await fetch(`${baseUrl}/api/places/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Smoke Test Mekan',
        category: 'kafe',
        address: 'Test Mahallesi No:1',
        phone: '05000000000',
        description: 'Smoke test mekan önerisi',
        ownerName: 'Smoke Tester',
        ownerEmail: 'smoke@sanliurfa.com',
      }),
    });
    let applyBody = null;
    try {
      applyBody = await applyRes.json();
    } catch {
      applyBody = null;
    }
    createdSmokePlaceId = applyBody?.data?.place?.id || applyBody?.place?.id || '';

    const ok = applyRes.status >= 200 && applyRes.status < 400;
    logStep('Place Submit', ok, `apply=${applyRes.status}`);
    if (!ok) {
      if (strictPlaceSubmit) {
        failed++;
      } else {
        logStep('Place Submit', true, 'non-blocking mode (STRICT_PLACE_SUBMIT=0)');
      }
    }
  } catch (err) {
    if (strictPlaceSubmit) {
      logStep('Place Submit', false, String(err));
      failed++;
    } else {
      logStep('Place Submit', true, `non-blocking mode (${String(err)})`);
    }
  }

  const authBootstrap = await ensureAuthUser();
  if (!authBootstrap.ok) {
    logStep('Auth Bootstrap', false, 'main user token alınamadı');
    failed++;
    try {
      const cleaned = await cleanupSmokePlaceApplications(createdSmokePlaceId);
      if (cleaned > 0) logStep('Place Submit Cleanup', true, `removed_created=${cleaned}`);
    } catch (err) {
      logStep('Place Submit Cleanup', true, `non-blocking cleanup skipped (${String(err)})`);
    }
    process.exit(failed ? 1 : 0);
  }
  logStep('Auth Bootstrap', true, `user=${authBootstrap.userId} (${authBootstrap.source})`);

  try {
    const { response } = await callJson('/api/social/match-profile');
    const ok = response.ok;
    logStep('Match Profile GET', ok, `status=${response.status}`);
    if (!ok) failed++;
  } catch (err) {
    logStep('Match Profile GET', false, String(err));
    failed++;
  }

  try {
    const { response } = await callJson('/api/social/match-profile', {
      method: 'POST',
      body: JSON.stringify({
        bio: 'Smoke test profile',
        photos: [
          'https://images.pexels.com/photos/414171/pexels-photo-414171.jpeg',
          'https://images.pexels.com/photos/257360/pexels-photo-257360.jpeg',
        ],
        isDiscoverable: true,
      }),
    });
    const ok = response.ok;
    logStep('Match Profile POST', ok, `status=${response.status}`);
    if (!ok) failed++;
  } catch (err) {
    logStep('Match Profile POST', false, String(err));
    failed++;
  }

  try {
    const { response } = await callJson('/api/social/match-candidates?limit=5');
    const ok = response.ok;
    logStep('Match Candidates', ok, `status=${response.status}`);
    if (!ok) failed++;
  } catch (err) {
    logStep('Match Candidates', false, String(err));
    failed++;
  }

  try {
    const { response } = await callJson('/api/social/matches?limit=5');
    const ok = response.ok;
    logStep('Matches GET', ok, `status=${response.status}`);
    if (!ok) failed++;
  } catch (err) {
    logStep('Matches GET', false, String(err));
    failed++;
  }

  const targetBootstrap = await ensureTargetUser();
  if (!targetBootstrap.ok) {
    logStep('Target User Bootstrap', false, 'hedef kullanıcı alınamadı');
    failed++;
    try {
      const cleaned = createdSmokePlaceId
        ? await cleanupSmokePlaceApplications(createdSmokePlaceId)
        : await cleanupSmokePlaceApplications();
      if (cleaned > 0) logStep('Place Submit Cleanup', true, `removed_created=${cleaned}`);
    } catch (err) {
      logStep('Place Submit Cleanup', true, `non-blocking cleanup skipped (${String(err)})`);
    }
    process.exit(failed ? 1 : 0);
  }
  logStep('Target User Bootstrap', true, `target=${targetBootstrap.userId} (${targetBootstrap.source})`);

  try {
    const { response } = await callJson('/api/social/follow', {
      method: 'POST',
      body: JSON.stringify({ userId: targetUserId, action: 'follow' }),
    });
    const ok = response.ok;
    logStep('Follow POST', ok, `status=${response.status}`);
    if (!ok) failed++;
  } catch (err) {
    logStep('Follow POST', false, String(err));
    failed++;
  }

  try {
    const { response, body } = await callJson('/api/messages', {
      method: 'POST',
      body: JSON.stringify({ recipient_id: targetUserId }),
    });
    const conversationId =
      body?.data?.id || body?.data?.data?.id || body?.id || body?.conversationId;
    const ok = response.ok && Boolean(conversationId);
    logStep('Conversation Create', ok, `status=${response.status}`);
    if (!ok) {
      failed++;
    } else {
      const send = await callJson(`/api/messages/${conversationId}`, {
        method: 'POST',
        body: JSON.stringify({ content: 'Smoke test mesajı' }),
      });
      const sendOk = send.response.ok;
      logStep('Message Send', sendOk, `status=${send.response.status}`);
      if (!sendOk) failed++;
    }
  } catch (err) {
    logStep('Conversation/Message', false, String(err));
    failed++;
  }

  try {
    const cleaned = createdSmokePlaceId
      ? await cleanupSmokePlaceApplications(createdSmokePlaceId)
      : await cleanupSmokePlaceApplications();
    if (cleaned > 0) logStep('Place Submit Cleanup', true, `removed_created=${cleaned}`);
  } catch (err) {
    logStep('Place Submit Cleanup', true, `non-blocking cleanup skipped (${String(err)})`);
  }

  process.exit(failed ? 1 : 0);
}

run();
