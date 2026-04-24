import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

describe('openapi social + lifecycle contract', () => {
  it('documents social stream, timeline and lifecycle schemas', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    expect(spec?.paths?.['/admin/social/events']).toBeDefined();
    expect(spec?.paths?.['/admin/social/events/stream']).toBeDefined();
    expect(spec?.paths?.['/admin/social/events/export']).toBeDefined();
    expect(spec?.paths?.['/admin/places/lifecycle']).toBeDefined();
    expect(spec?.paths?.['/admin/places/lifecycle/sla']).toBeDefined();
    expect(spec?.paths?.['/admin/places/lifecycle/export']).toBeDefined();
    expect(spec?.paths?.['/admin/reports/social-lifecycle']).toBeDefined();
    expect(spec?.paths?.['/admin/exports/token']).toBeDefined();
    expect(spec?.paths?.['/admin/exports/token']?.delete).toBeDefined();
    expect(spec?.paths?.['/admin/social/risk']).toBeDefined();
    expect(spec?.paths?.['/admin/social/risk/webhook-log']).toBeDefined();
    expect(spec?.paths?.['/admin/social/risk/webhook-metrics']).toBeDefined();
    expect(spec?.paths?.['/admin/social/risk/webhook-test']).toBeDefined();
    expect(spec?.paths?.['/admin/monitoring/ack']).toBeDefined();
    expect(spec?.paths?.['/admin/exports/token/clipboard']).toBeDefined();

    expect(
      spec?.paths?.['/admin/social/events']?.get?.responses?.['200']?.content?.['application/json']?.schema?.$ref,
    ).toBe('#/components/schemas/SocialEventsResponse');
    expect(
      spec?.paths?.['/admin/places/lifecycle']?.get?.responses?.['200']?.content?.['application/json']?.schema
        ?.$ref,
    ).toBe('#/components/schemas/PlaceLifecycleTimelineResponse');
    expect(
      spec?.paths?.['/admin/places/lifecycle/sla']?.get?.responses?.['200']?.content?.['application/json']
        ?.schema?.$ref,
    ).toBe('#/components/schemas/PlaceLifecycleSlaResponse');

    expect(
      spec?.paths?.['/admin/social/events/stream']?.get?.responses?.['200']?.content?.['text/event-stream']?.schema
        ?.type,
    ).toBe('string');

    expect(spec?.components?.schemas?.SocialEventItem).toBeDefined();
    expect(spec?.components?.schemas?.SocialEventsResponse).toBeDefined();
    expect(spec?.components?.schemas?.PlaceLifecycleEventItem).toBeDefined();
    expect(spec?.components?.schemas?.PlaceLifecycleTimelineResponse).toBeDefined();
    expect(spec?.components?.schemas?.PlaceLifecycleSlaResponse).toBeDefined();
    expect(spec?.components?.schemas?.SocialLifecycleReportResponse).toBeDefined();
    expect(spec?.components?.schemas?.SocialEventsResponse?.properties?.nextCursor).toBeDefined();
    expect(spec?.components?.schemas?.AdminExportTokenResponse).toBeDefined();
    expect(spec?.components?.schemas?.SocialRiskDashboardResponse).toBeDefined();
  });

  it('documents export token policy, monitoring modes and risk auto action schema details', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    const exportPostBody =
      spec?.paths?.['/admin/exports/token']?.post?.requestBody?.content?.['application/json']?.schema;
    expect(exportPostBody?.required).toContain('resourceKey');
    expect(exportPostBody?.properties?.allowedIpCidrs?.type).toBe('array');
    expect(exportPostBody?.properties?.allowedCountries?.type).toBe('array');
    expect(exportPostBody?.properties?.replayProtection?.type).toBe('boolean');

    const exportDeleteBody =
      spec?.paths?.['/admin/exports/token']?.delete?.requestBody?.content?.['application/json']?.schema;
    expect(exportDeleteBody?.properties?.token).toBeDefined();
    expect(exportDeleteBody?.properties?.tokenId).toBeDefined();
    expect(exportDeleteBody?.properties?.reason).toBeDefined();

    const monitoringAckBody =
      spec?.paths?.['/admin/monitoring/ack']?.post?.requestBody?.content?.['application/json']?.schema;
    expect(monitoringAckBody?.properties?.mode?.enum).toEqual([
      'ack',
      'snooze',
      'maintenance',
      'clear',
    ]);
    expect(monitoringAckBody?.properties?.snoozeMinutes?.maximum).toBe(1440);
    expect(monitoringAckBody?.properties?.maintenanceMinutes?.maximum).toBe(1440);
    expect(monitoringAckBody?.properties?.clearMaintenance?.type).toBe('boolean');

    const monitoringAckResponse =
      spec?.paths?.['/admin/monitoring/ack']?.post?.responses?.['200']?.content?.['application/json']?.schema;
    expect(monitoringAckResponse?.properties?.mode?.enum).toEqual([
      'ack',
      'snooze',
      'maintenance',
      'clear',
    ]);
    expect(monitoringAckResponse?.properties?.alarmKey?.nullable).toBe(true);

    const tokenListItem = spec?.components?.schemas?.AdminExportTokenListItem;
    expect(tokenListItem?.properties?.payload?.type).toBe('object');
    expect(tokenListItem?.properties?.payload?.nullable).toBe(true);

    const riskResponse = spec?.components?.schemas?.SocialRiskDashboardResponse;
    expect(riskResponse?.properties?.autoActions?.type).toBe('object');
    expect(riskResponse?.properties?.autoActions?.properties?.appliedTenantIds?.type).toBe('array');
    expect(riskResponse?.properties?.autoActions?.properties?.rollbackCount?.type).toBe('integer');
  });
});
