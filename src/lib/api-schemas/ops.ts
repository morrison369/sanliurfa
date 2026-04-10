export const healthStatusSchema = {
  type: 'string',
  enum: ['healthy', 'degraded', 'blocked'],
};

export const artifactHealthEntrySchema = {
  type: 'object',
  properties: {
    available: { type: 'boolean' },
    status: healthStatusSchema,
    generatedAt: { type: ['string', 'null'], format: 'date-time' },
  },
  required: ['available', 'status', 'generatedAt'],
};

export const artifactHealthChecksSchema = {
  type: 'object',
  properties: {
    releaseGate: artifactHealthEntrySchema,
    nightlyRegression: artifactHealthEntrySchema,
    nightlyE2E: artifactHealthEntrySchema,
  },
  required: ['releaseGate', 'nightlyRegression', 'nightlyE2E'],
};

export const adminArtifactHealthSnapshotSchema = {
  type: 'object',
  properties: {
    releaseGate: artifactHealthEntrySchema,
    nightlyRegression: artifactHealthEntrySchema,
    nightlyE2E: artifactHealthEntrySchema,
    performanceOps: artifactHealthEntrySchema,
  },
  required: ['releaseGate', 'nightlyRegression', 'nightlyE2E', 'performanceOps'],
};

export const adminArtifactHealthSummarySchema = {
  type: 'object',
  properties: {
    overall: healthStatusSchema,
    healthyCount: { type: 'integer' },
    degradedCount: { type: 'integer' },
    blockedCount: { type: 'integer' },
    total: { type: 'integer' },
  },
  required: ['overall', 'healthyCount', 'degradedCount', 'blockedCount', 'total'],
};

export const integrationSummarySchema = {
  type: 'object',
  properties: {
    configuredCount: { type: 'integer' },
    total: { type: 'integer' },
    fullyConfigured: { type: 'boolean' },
  },
  required: ['configuredCount', 'total', 'fullyConfigured'],
};

export const integrationVerificationSchema = {
  type: 'object',
  properties: {
    resend: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
        checkedAt: { type: 'string', format: 'date-time' },
      },
      required: ['status', 'message', 'checkedAt'],
    },
    analytics: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        message: { type: 'string' },
        checkedAt: { type: 'string', format: 'date-time' },
      },
      required: ['status', 'message', 'checkedAt'],
    },
    summary: {
      type: 'object',
      properties: {
        healthy: { type: 'boolean' },
        checkedAt: { type: 'string', format: 'date-time' },
      },
      required: ['healthy', 'checkedAt'],
    },
  },
  required: ['resend', 'analytics', 'summary'],
};

export const integrationSettingSchema = {
  type: 'object',
  properties: {
    configured: { type: 'boolean' },
    source: { type: 'string' },
    maskedValue: { type: 'string' },
  },
  required: ['configured', 'source', 'maskedValue'],
};

export const integrationSettingsResponseSchema = {
  type: 'object',
  properties: {
    resend: integrationSettingSchema,
    analytics: integrationSettingSchema,
    verification: {
      anyOf: [integrationVerificationSchema, { type: 'null' }],
    },
  },
  required: ['resend', 'analytics'],
};

export const adminOpsAuditEntrySchema = {
  type: 'object',
  properties: {
    timestamp: { type: 'string', format: 'date-time' },
    endpoint: { type: 'string' },
    method: { type: 'string' },
    mode: { type: 'string', enum: ['read', 'write'] },
    requestId: { type: ['string', 'null'] },
    actorKey: { type: 'string' },
    userId: { type: ['string', 'null'] },
    ipAddress: { type: 'string' },
    statusCode: { type: 'integer' },
    duration: { type: 'integer' },
    outcome: { type: 'string', enum: ['allowed', 'denied', 'error'] },
    details: { type: ['object', 'null'], additionalProperties: true },
  },
  required: ['timestamp', 'endpoint', 'method', 'mode', 'requestId', 'actorKey', 'userId', 'ipAddress', 'statusCode', 'duration', 'outcome'],
};

export const adminOpsAuditSummarySchema = {
  type: 'object',
  properties: {
    generatedAt: { type: 'string', format: 'date-time' },
    windowHours: { type: 'integer' },
    total: { type: 'integer' },
    deniedCount: { type: 'integer' },
    rateLimitedCount: { type: 'integer' },
    writeCount: { type: 'integer' },
    readCount: { type: 'integer' },
    lastDeniedAt: { type: ['string', 'null'], format: 'date-time' },
  },
  required: ['generatedAt', 'windowHours', 'total', 'deniedCount', 'rateLimitedCount', 'writeCount', 'readCount', 'lastDeniedAt'],
};

export const adminStatusSummarySchema = {
  type: 'object',
  properties: {
    integrations: healthStatusSchema,
    regression: healthStatusSchema,
    e2e: healthStatusSchema,
    releaseGate: healthStatusSchema,
    overall: healthStatusSchema,
  },
  required: ['integrations', 'regression', 'e2e', 'releaseGate', 'overall'],
};

export const nightlySummarySchema = {
  type: 'object',
  properties: {
    available: { type: 'boolean' },
    kind: { type: 'string' },
    generatedAt: { type: ['string', 'null'], format: 'date-time' },
    outcome: { type: 'string' },
    successRatePercent: { type: ['integer', 'null'] },
    recentOutcomes: {
      type: 'array',
      items: { type: 'string' },
    },
    topFailures: {
      type: 'array',
      items: { type: 'string' },
    },
    performanceOptimization: {
      type: ['object', 'null'],
      properties: {
        recommendations: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            highPriority: { type: 'integer' },
            mediumPriority: { type: 'integer' },
          },
          required: ['total', 'highPriority', 'mediumPriority'],
        },
        metrics: {
          type: 'object',
          properties: {
            slowRequestRate: { type: 'integer' },
            cacheHitRate: { type: 'integer' },
          },
          required: ['slowRequestRate', 'cacheHitRate'],
        },
      },
      required: ['recommendations', 'metrics'],
    },
  },
  required: ['available', 'kind', 'generatedAt', 'outcome', 'successRatePercent', 'recentOutcomes', 'topFailures', 'performanceOptimization'],
};

export const performanceOptimizationSummarySchema = {
  type: 'object',
  properties: {
    generatedAt: { type: 'string', format: 'date-time' },
    recommendations: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        highPriority: { type: 'integer' },
        mediumPriority: { type: 'integer' },
      },
      required: ['total', 'highPriority', 'mediumPriority'],
    },
    metrics: {
      type: 'object',
      properties: {
        slowQueriesCount: { type: 'integer' },
        slowRequestRate: { type: 'integer' },
        cacheHitRate: { type: 'integer' },
        avgRequestDuration: { type: 'integer' },
        p95Duration: { type: 'integer' },
      },
      required: ['slowQueriesCount', 'slowRequestRate', 'cacheHitRate', 'avgRequestDuration', 'p95Duration'],
    },
    cacheStrategies: {
      type: 'object',
      properties: {
        count: { type: 'integer' },
      },
      required: ['count'],
    },
    indexSuggestions: {
      type: 'object',
      properties: {
        count: { type: 'integer' },
        top: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['count', 'top'],
    },
    slowOperations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          message: { type: 'string' },
          duration: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['type', 'message', 'duration', 'timestamp'],
      },
    },
  },
  required: ['generatedAt', 'recommendations', 'metrics', 'cacheStrategies', 'indexSuggestions', 'slowOperations'],
};

export const releaseGateSummarySchema = {
  type: 'object',
  properties: {
    available: { type: 'boolean' },
    generatedAt: { type: ['string', 'null'], format: 'date-time' },
    finalStatus: { type: 'string' },
    failedStepCount: { type: 'integer' },
    blockingFailedSteps: {
      type: 'array',
      items: { type: 'string' },
    },
    advisoryFailedSteps: {
      type: 'array',
      items: { type: 'string' },
    },
    performanceOptimization: {
      type: ['object', 'null'],
      properties: {
        recommendations: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            highPriority: { type: 'integer' },
            mediumPriority: { type: 'integer' },
          },
          required: ['total', 'highPriority', 'mediumPriority'],
        },
        metrics: {
          type: 'object',
          properties: {
            slowRequestRate: { type: 'integer' },
            cacheHitRate: { type: 'integer' },
          },
          required: ['slowRequestRate', 'cacheHitRate'],
        },
      },
      required: ['recommendations', 'metrics'],
    },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          step: { type: 'string' },
          command: { type: 'string' },
          advisory: { type: 'boolean' },
          status: { type: 'string' },
        },
        required: ['step', 'command', 'advisory', 'status'],
      },
    },
  },
  required: ['available', 'generatedAt', 'finalStatus', 'failedStepCount', 'blockingFailedSteps', 'advisoryFailedSteps', 'performanceOptimization', 'steps'],
};
