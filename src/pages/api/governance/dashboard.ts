// @ts-nocheck
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  // In production, check admin authentication here
  
  // Mock data for governance dashboard
  const dashboard = {
    summary: {
      totalAuditEntries: 12543,
      entriesLast24h: 234,
      entriesLast7d: 1543,
      sensitiveOperations: 89,
      piiAccessEvents: 12,
    },
    recentEntries: [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        entity: 'users',
        entityId: 'user-123',
        action: 'update',
        actor: 'admin@sanliurfa.com',
        actorType: 'user',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        entity: 'places',
        entityId: 'place-456',
        action: 'create',
        actor: 'vendor@sanliurfa.com',
        actorType: 'user',
      },
    ],
    metrics: {
      byEntity: [
        { entity: 'users', count: 5432 },
        { entity: 'places', count: 3210 },
        { entity: 'reviews', count: 2891 },
        { entity: 'events', count: 1010 },
      ],
      byAction: [
        { action: 'create', count: 5432 },
        { action: 'update', count: 4567 },
        { action: 'delete', count: 1234 },
        { action: 'archive', count: 890 },
      ],
      byActorType: [
        { type: 'user', count: 9876 },
        { type: 'system', count: 1234 },
        { type: 'api', count: 890 },
        { type: 'batch', count: 543 },
      ],
    },
    compliance: {
      score: 94,
      status: 'good',
      issues: [
        { severity: 'warning', message: '3 kullanıcı hesabı uzun süredir aktif değil' },
        { severity: 'info', message: 'Yedekleme başarıyla tamamlandı' },
      ],
      lastAudit: new Date(Date.now() - 86400000).toISOString(),
    },
    dataRetention: {
      activePolicies: 12,
      recordsScheduledForDeletion: 456,
      nextPurgeDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    },
  };

  return new Response(
    JSON.stringify(dashboard),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
