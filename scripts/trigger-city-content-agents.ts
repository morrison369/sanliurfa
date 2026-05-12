#!/usr/bin/env tsx
/**
 * 6 city content agent'ı bir kez tetikler — initial drafts seed.
 * Doğrudan lib fonksiyonunu çağırır, admin auth bypass.
 *
 * Kullanım (prod):
 *   cd /home/sanliur/public_html && npx tsx scripts/trigger-city-content-agents.ts
 *
 * Çıktı: her ajan için { agent, draftsCreated, status }.
 * autoPublish: false → tüm draftlar 'pending', admin onayına düşer.
 */
import {
  CITY_CONTENT_AGENTS,
  runCityContentAgent,
  listCityContentDrafts,
  type CityContentAgentKey,
} from '../src/lib/city-content-agents';
import { queryOne } from '../src/lib/postgres';

async function getAdminUserId(): Promise<string | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE role = 'admin' AND email = 'admin@sanliurfa.com' LIMIT 1`,
  );
  return row?.id ?? null;
}

async function main(): Promise<void> {
  const adminId = await getAdminUserId();
  if (!adminId) {
    console.error('FATAL: admin user not found (admin@sanliurfa.com)');
    process.exit(2);
  }
  console.log(`Admin user id: ${adminId}\n`);

  const results: Array<{ agent: string; status: string; drafts: number; error?: string }> = [];

  for (const agent of CITY_CONTENT_AGENTS) {
    const key = agent.key as CityContentAgentKey;
    process.stdout.write(`[${key}] ... `);
    try {
      const result = await runCityContentAgent({ agentKey: key, userId: adminId });
      const draftCount = result.drafts.length;
      results.push({ agent: key, status: 'ok', drafts: draftCount });
      console.log(`OK — ${draftCount} draft, jobId=${result.job.id.slice(0, 8)}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ agent: key, status: 'fail', drafts: 0, error: msg });
      console.log(`FAIL — ${msg}`);
    }
  }

  // Final state
  const allDrafts = await listCityContentDrafts();
  const pending = allDrafts.filter((d) => d.status === 'pending');

  console.log('\n=== ÖZET ===');
  for (const r of results) {
    console.log(`  ${r.status === 'ok' ? '✓' : '✗'} ${r.agent.padEnd(25)} drafts=${r.drafts}${r.error ? ` (${r.error})` : ''}`);
  }
  console.log(`\nToplam pending draft: ${pending.length}`);
  console.log(`Admin review URL: https://sanliurfa.com/admin/content-agents`);

  // Pool drain — graceful shutdown
  process.exit(0);
}

main().catch((err) => {
  console.error('UNCAUGHT:', err);
  process.exit(1);
});
