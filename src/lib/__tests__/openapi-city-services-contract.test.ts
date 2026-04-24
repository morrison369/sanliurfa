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
});

