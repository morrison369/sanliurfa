import { describe, expect, it } from 'vitest';

describe('openapi runtime contracts', () => {
  it('documents health and performance endpoints with normalized status semantics', async () => {
    const { GET } = await import('../openapi.json.ts');

    const response = await GET({} as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.paths['/api/health']).toBeDefined();
    expect(body.paths['/api/health/detailed']).toBeDefined();
    expect(body.paths['/api/performance']).toBeDefined();
    expect(body.paths['/api/admin/performance/optimization']).toBeDefined();
    expect(body.paths['/api/admin/system/artifact-health']).toBeDefined();
    expect(body.paths['/api/admin/deployment/status']).toBeDefined();

    const healthStatusEnum = body.paths['/api/health'].get.responses['200'].content['application/json'].schema.properties.data.properties.status.enum;
    const healthArtifactSchema =
      body.paths['/api/health'].get.responses['200'].content['application/json'].schema.properties.data.properties.checks.properties.artifacts;
    const detailedStatusEnum = body.paths['/api/health/detailed'].get.responses['200'].content['application/json'].schema.properties.data.properties.status.enum;
    const oauthStatusEnum = body.paths['/api/performance'].get.responses['200'].content['application/json'].schema.properties.data.properties.serviceLevelObjectives.properties.oauth.properties.status.enum;
    const performanceArtifactSchema =
      body.paths['/api/performance'].get.responses['200'].content['application/json'].schema.properties.data.properties.artifactHealth;
    const performanceArtifactSummarySchema =
      body.paths['/api/performance'].get.responses['200'].content['application/json'].schema.properties.data.properties.artifactHealthSummary;
    const detailedArtifactSchema =
      body.paths['/api/health/detailed'].get.responses['200'].content['application/json'].schema.properties.data.properties.checks.properties.artifacts;
    const optimizationArtifactSchema =
      body.paths['/api/admin/performance/optimization'].get.responses['200'].content['application/json'].schema.properties.data.properties.data.properties.artifactHealth;
    const optimizationArtifactSummarySchema =
      body.paths['/api/admin/performance/optimization'].get.responses['200'].content['application/json'].schema.properties.data.properties.data.properties.artifactHealthSummary;
    const adminArtifactHealthSchema =
      body.paths['/api/admin/system/artifact-health'].get.responses['200'].content['application/json'].schema.properties.data.properties.data.properties;
    const deploymentArtifactHealthSchema =
      body.paths['/api/admin/deployment/status'].get.responses['200'].content['application/json'].schema.properties.data.properties.data.properties.artifactHealth;
    const deploymentArtifactHealthSummarySchema =
      body.paths['/api/admin/deployment/status'].get.responses['200'].content['application/json'].schema.properties.data.properties.data.properties.artifactHealthSummary;

    expect(healthStatusEnum).toEqual(['healthy', 'degraded', 'blocked']);
    expect(healthArtifactSchema.required).toEqual(['releaseGate', 'nightlyRegression', 'nightlyE2E']);
    expect(healthArtifactSchema.properties.releaseGate.properties.available.type).toBe('boolean');
    expect(healthArtifactSchema.properties.releaseGate.properties.status.enum).toEqual(['healthy', 'degraded', 'blocked']);
    expect(detailedStatusEnum).toEqual(['healthy', 'degraded', 'blocked']);
    expect(oauthStatusEnum).toEqual(['healthy', 'degraded', 'blocked']);
    expect(performanceArtifactSchema.required).toEqual(['releaseGate', 'nightlyRegression', 'nightlyE2E']);
    expect(performanceArtifactSchema.properties.releaseGate.properties.generatedAt.type).toEqual(['string', 'null']);
    expect(performanceArtifactSummarySchema.required).toEqual(['overall', 'healthyCount', 'degradedCount', 'blockedCount', 'total']);
    expect(detailedArtifactSchema.required).toEqual(['releaseGate', 'nightlyRegression', 'nightlyE2E']);
    expect(optimizationArtifactSchema.required).toEqual(['releaseGate', 'nightlyRegression', 'nightlyE2E']);
    expect(optimizationArtifactSchema.properties.releaseGate.properties.status.enum).toEqual(['healthy', 'degraded', 'blocked']);
    expect(optimizationArtifactSummarySchema.required).toEqual(['overall', 'healthyCount', 'degradedCount', 'blockedCount', 'total']);
    expect(adminArtifactHealthSchema.summary.required).toEqual(['overall', 'healthyCount', 'degradedCount', 'blockedCount', 'total']);
    expect(adminArtifactHealthSchema.summary.properties.overall.enum).toEqual(['healthy', 'degraded', 'blocked']);
    expect(adminArtifactHealthSchema.artifacts.properties.performanceOps.properties.available.type).toBe('boolean');
    expect(adminArtifactHealthSchema.artifacts.properties.performanceOps.properties.generatedAt.type).toEqual(['string', 'null']);
    expect(deploymentArtifactHealthSchema.required).toEqual(['releaseGate', 'nightlyRegression', 'nightlyE2E', 'performanceOps']);
    expect(deploymentArtifactHealthSchema.properties.performanceOps.properties.status.enum).toEqual(['healthy', 'degraded', 'blocked']);
    expect(deploymentArtifactHealthSummarySchema.required).toEqual(['overall', 'healthyCount', 'degradedCount', 'blockedCount', 'total']);
    expect(detailedArtifactSchema.properties.releaseGate.required).toEqual(['available', 'status', 'generatedAt']);
    expect(detailedArtifactSchema.properties.releaseGate.properties.available.type).toBe('boolean');
    expect(detailedArtifactSchema.properties.releaseGate.properties.status.enum).toEqual(['healthy', 'degraded', 'blocked']);
    expect(detailedArtifactSchema.properties.releaseGate.properties.generatedAt.type).toEqual(['string', 'null']);
  });

  it('documents optimization response shape with normalized slow operation fields', async () => {
    const { GET } = await import('../openapi.json.ts');

    const response = await GET({} as any);
    const body = await response.json();
    const optimizationSchema =
      body.paths['/api/admin/performance/optimization'].get.responses['200'].content['application/json'].schema.properties.data.properties.data;
    const slowOperationFields = optimizationSchema.properties.slowOperations.items.properties;

    expect(slowOperationFields.type.type).toBe('string');
    expect(slowOperationFields.message.type).toBe('string');
    expect(slowOperationFields.duration.type).toBe('integer');
    expect(slowOperationFields.timestamp.type).toBe('number');
  });
});
