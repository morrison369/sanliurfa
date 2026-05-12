#!/usr/bin/env node
/**
 * Uptime Monitor — basic external healthcheck.
 *
 * Cron: her 5 dakikada bir çalışır, /api/health'i pingler. Yanıt 503 veya
 * timeout durumunda webhook'a (Discord/Slack/Telegram) alert gönderir.
 *
 * Kullanım (cron):
 *   * /5 * * * * cd /home/sanliur/public_html && node scripts/monitoring/uptime-check.mjs
 *
 * Env vars:
 *   MONITOR_TARGET_URL    — health endpoint (default: https://sanliurfa.com/api/health)
 *   MONITOR_WEBHOOK_URL   — Discord/Slack webhook (optional; alert gönderir)
 *   MONITOR_FAIL_THRESHOLD — kaç ardışık fail sonra alert (default 2)
 *   MONITOR_STATE_FILE    — son durum (default /tmp/sf-monitor-state.json)
 */
import fs from 'node:fs';
import https from 'node:https';

const TARGET = process.env.MONITOR_TARGET_URL || 'https://sanliurfa.com/api/health';
const WEBHOOK = process.env.MONITOR_WEBHOOK_URL || '';
const FAIL_THRESHOLD = parseInt(process.env.MONITOR_FAIL_THRESHOLD || '2', 10);
const STATE_FILE = process.env.MONITOR_STATE_FILE || '/tmp/sf-monitor-state.json';
const TIMEOUT_MS = 10000;

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { failCount: 0, lastAlertAt: 0, lastStatus: 'unknown' };
  }
}

function saveState(state) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch { /* sessiz */ }
}

function probe(url) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const req = https.get(url, (res) => {
      let _data = '';
      res.on('data', (c) => (_data += c));
      res.on('end', () => {
        const latencyMs = Date.now() - startedAt;
        resolve({ ok: res.statusCode === 200, status: res.statusCode, latencyMs });
      });
    });
    req.on('error', (err) => resolve({ ok: false, status: 0, latencyMs: Date.now() - startedAt, error: err.message }));
    req.setTimeout(TIMEOUT_MS, () => { req.destroy(); resolve({ ok: false, status: 0, latencyMs: TIMEOUT_MS, error: 'timeout' }); });
  });
}

function postWebhook(content) {
  if (!WEBHOOK) return Promise.resolve();
  return new Promise((resolve) => {
    const body = JSON.stringify({ content, username: 'Sanliurfa Uptime' });
    const u = new URL(WEBHOOK);
    const req = https.request({
      hostname: u.hostname, port: 443, path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', () => resolve());
    req.setTimeout(5000, () => { req.destroy(); resolve(); });
    req.write(body);
    req.end();
  });
}

(async () => {
  const state = loadState();
  const result = await probe(TARGET);

  if (result.ok) {
    if (state.failCount >= FAIL_THRESHOLD) {
      // Recovery — alert resolved
      await postWebhook(`✅ **Sanliurfa.com RECOVERED** — ${TARGET} → ${result.status} (${result.latencyMs}ms)`);
    }
    state.failCount = 0;
    state.lastStatus = 'ok';
  } else {
    state.failCount = (state.failCount || 0) + 1;
    state.lastStatus = 'fail';
    if (state.failCount === FAIL_THRESHOLD) {
      // İlk alert — 2 ardışık fail sonra
      const errInfo = result.error ? `\nError: ${result.error}` : '';
      await postWebhook(`🚨 **Sanliurfa.com DOWN** — ${TARGET}\nStatus: ${result.status}\nLatency: ${result.latencyMs}ms${errInfo}\nFail count: ${state.failCount}`);
      state.lastAlertAt = Date.now();
    } else if (state.failCount > FAIL_THRESHOLD && (Date.now() - state.lastAlertAt) > 30 * 60 * 1000) {
      // Re-alert her 30 dakikada bir (recovery'e kadar)
      await postWebhook(`⏳ **Sanliurfa.com STILL DOWN** — ${state.failCount} fail (~${Math.round((state.failCount * 5))} dk)`);
      state.lastAlertAt = Date.now();
    }
  }

  saveState(state);
  console.log(JSON.stringify({ at: new Date().toISOString(), ...result, failCount: state.failCount }));
  process.exit(result.ok ? 0 : 1);
})();
