import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

describe('openapi city services contract', () => {
  it('documents social, transport, health and weather endpoints', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    expect(spec?.paths?.['/social/messages']).toBeDefined();
    expect(spec?.paths?.['/social/swipe']).toBeDefined();
    expect(spec?.paths?.['/social/follow']).toBeDefined();

    expect(spec?.paths?.['/transport/status']).toBeDefined();
    expect(spec?.paths?.['/saglik/nobetci']).toBeDefined();
    expect(spec?.paths?.['/weather/current']).toBeDefined();
    expect(spec?.paths?.['/weather/status']).toBeDefined();
  });

  it('documents city content agent draft filters and summary response', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);
    const spec = await response.json();

    const operation = spec?.paths?.['/admin/city-content-agents']?.get;
    expect(operation).toBeDefined();
    expect(operation.parameters.map((param: { name: string }) => param.name)).toEqual([
      'status',
      'draftType',
      'limit',
      'offset',
    ]);

    const schema = operation.responses?.['200']?.content?.['application/json']?.schema;
    const dataProperties = schema?.properties?.data?.properties;
    expect(dataProperties?.drafts).toBeDefined();
    expect(dataProperties?.draftSummary?.properties?.total?.type).toBe('integer');
    expect(dataProperties?.draftSummary?.properties?.byStatus?.additionalProperties?.type).toBe(
      'integer'
    );
    expect(dataProperties?.draftSummary?.properties?.byType?.additionalProperties?.type).toBe(
      'integer'
    );
  });
});
