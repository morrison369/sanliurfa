import type { APIRoute } from 'astro';
import {
  adminAuditLogsDataSchema,
  adminArtifactHealthSnapshotSchema,
  adminArtifactHealthSummarySchema,
  adminMessageStatusMutationDataSchema,
  adminOpsAuditEntrySchema,
  adminOpsAuditSummarySchema,
  adminStatusSummarySchema,
  artifactHealthChecksSchema,
  healthStatusSchema,
  integrationSettingsResponseSchema,
  integrationSummarySchema,
  integrationVerificationSchema,
  nightlySummarySchema,
  performanceOptimizationSummarySchema,
  releaseGateSummarySchema,
  subscriptionUsersListDataSchema,
  subscriptionUsersMutationDataSchema,
} from '../../lib/api-schemas/ops';

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Şanlıurfa.com API',
    description: 'City guide and social platform API with webhooks, health checks, performance telemetry, and admin operations',
    version: '1.0.0',
  },
  servers: [
    { url: 'https://sanliurfa.com' },
    { url: 'http://localhost:4321' },
  ],
  tags: [
    { name: 'Webhooks', description: 'Webhook management and testing' },
    { name: 'Health', description: 'System health checks' },
    { name: 'Performance', description: 'Performance telemetry and optimization endpoints' },
    { name: 'Auth', description: 'Authentication' },
  ],
  paths: {
    '/api/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'List user webhooks',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of webhooks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          event: { type: 'string' },
                          url: { type: 'string', format: 'uri' },
                          active: { type: 'boolean' },
                          createdAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Register new webhook',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['event', 'url'],
                properties: {
                  event: { type: 'string', example: 'place.created' },
                  url: { type: 'string', format: 'uri' },
                  secret: { type: 'string', description: 'Optional secret for HMAC signature' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Webhook created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/webhooks/{id}': {
      delete: {
        tags: ['Webhooks'],
        summary: 'Delete webhook',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Webhook deleted' },
          '404': { description: 'Webhook not found' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/webhooks/analytics': {
      get: {
        tags: ['Webhooks'],
        summary: 'Get webhook analytics and metrics',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Webhook metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        totalWebhooks: { type: 'integer' },
                        totalEvents: { type: 'integer' },
                        deliveredEvents: { type: 'integer' },
                        failedEvents: { type: 'integer' },
                        pendingEvents: { type: 'integer' },
                        successRate: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/webhooks/test': {
      post: {
        tags: ['Webhooks'],
        summary: 'Test webhook with sample event',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['webhookId'],
                properties: {
                  webhookId: { type: 'string', format: 'uuid' },
                  testData: { type: 'object', description: 'Optional test payload' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Test webhook sent' },
          '404': { description: 'Webhook not found' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/webhooks/retry': {
      post: {
        tags: ['Webhooks'],
        summary: 'Retry failed webhook events',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  eventId: { type: 'string', format: 'uuid', description: 'Retry specific event' },
                  webhookId: { type: 'string', format: 'uuid', description: 'Retry all failed for webhook' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Events queued for retry' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Runtime health check',
        responses: {
          '200': {
            description: 'System is healthy or degraded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        status: healthStatusSchema,
                        uptime: { type: 'integer' },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string' },
                        checks: {
                          type: 'object',
                          properties: {
                            database: {
                              type: 'object',
                              properties: {
                                status: { type: 'string', enum: ['up', 'down'] },
                                responseTime: { type: 'integer' },
                              },
                              required: ['status'],
                            },
                            redis: {
                              type: 'object',
                              properties: {
                                status: { type: 'string', enum: ['up', 'down'] },
                                responseTime: { type: 'integer' },
                              },
                              required: ['status'],
                            },
                            integrations: {
                              type: 'object',
                              properties: {
                                resend: {
                                  type: 'object',
                                  properties: {
                                    configured: { type: 'boolean' },
                                  },
                                  required: ['configured'],
                                },
                                analytics: {
                                  type: 'object',
                                  properties: {
                                    configured: { type: 'boolean' },
                                  },
                                  required: ['configured'],
                                },
                              },
                              required: ['resend', 'analytics'],
                            },
                            artifacts: {
                              ...artifactHealthChecksSchema,
                            },
                            artifactSummary: adminArtifactHealthSummarySchema,
                          },
                          required: ['database', 'redis', 'integrations', 'artifacts', 'artifactSummary'],
                        },
                      },
                      required: ['status', 'uptime', 'timestamp', 'version', 'checks'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '503': { description: 'System is blocked' },
        },
      },
    },
    '/api/health/detailed': {
      get: {
        tags: ['Health'],
        summary: 'Detailed runtime health check for admins',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Detailed health report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        status: healthStatusSchema,
                        uptime: { type: 'integer' },
                        timestamp: { type: 'string', format: 'date-time' },
                        version: { type: 'string' },
                        system: {
                          type: 'object',
                          properties: {
                            nodeVersion: { type: 'string' },
                            platform: { type: 'string' },
                            memory: {
                              type: 'object',
                              properties: {
                                heapUsed: { type: 'integer' },
                                heapTotal: { type: 'integer' },
                                external: { type: 'integer' },
                                rss: { type: 'integer' },
                              },
                              required: ['heapUsed', 'heapTotal', 'external', 'rss'],
                            },
                            cpuUsage: {
                              type: 'object',
                              properties: {
                                user: { type: 'integer' },
                                system: { type: 'integer' },
                              },
                              required: ['user', 'system'],
                            },
                          },
                          required: ['nodeVersion', 'platform', 'memory', 'cpuUsage'],
                        },
                        checks: {
                          type: 'object',
                          properties: {
                            database: {
                              type: 'object',
                              properties: {
                                status: { type: 'string', enum: ['up', 'down'] },
                                responseTime: { type: 'integer' },
                                poolSize: { type: 'integer' },
                                poolAvailable: { type: 'integer' },
                                error: { type: 'string' },
                              },
                              required: ['status'],
                            },
                            redis: {
                              type: 'object',
                              properties: {
                                status: { type: 'string', enum: ['up', 'down'] },
                                responseTime: { type: 'integer' },
                                error: { type: 'string' },
                              },
                              required: ['status'],
                            },
                            artifacts: {
                              ...artifactHealthChecksSchema,
                            },
                            artifactSummary: adminArtifactHealthSummarySchema,
                          },
                          required: ['database', 'redis', 'artifacts', 'artifactSummary'],
                        },
                      },
                      required: ['status', 'uptime', 'timestamp', 'version', 'system', 'checks'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '403': { description: 'Unauthorized' },
          '503': { description: 'System is blocked' },
        },
      },
    },
    '/api/performance': {
      get: {
        tags: ['Performance'],
        summary: 'Detailed performance metrics for admins',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Performance telemetry snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        timestamp: { type: 'string', format: 'date-time' },
                        summary: {
                          type: 'object',
                          properties: {
                            totalRequests: { type: 'integer' },
                            slowQueryCount: { type: 'integer' },
                            slowRequestCount: { type: 'integer' },
                            avgQueryDuration: { type: 'string' },
                            maxQueryDuration: { type: 'string' },
                          },
                          required: ['totalRequests', 'slowQueryCount', 'slowRequestCount', 'avgQueryDuration', 'maxQueryDuration'],
                        },
                        serviceLevelObjectives: {
                          type: 'object',
                          properties: {
                            oauth: {
                              type: 'object',
                              properties: {
                                authorizeRequests: { type: 'integer' },
                                callbackRequests: { type: 'integer' },
                                callbackErrorRatePercent: { type: 'integer' },
                                status: healthStatusSchema,
                              },
                              required: ['authorizeRequests', 'callbackRequests', 'callbackErrorRatePercent', 'status'],
                            },
                            webhookIngestion: {
                              type: 'object',
                              properties: {
                                requests: { type: 'integer' },
                                successCount: { type: 'integer' },
                                errorCount: { type: 'integer' },
                                duplicateCount: { type: 'integer' },
                                retryDeferredCount: { type: 'integer' },
                                retryExhaustedCount: { type: 'integer' },
                                p95DurationMs: { type: 'integer' },
                                status: healthStatusSchema,
                              },
                              required: ['requests', 'successCount', 'errorCount', 'duplicateCount', 'retryDeferredCount', 'retryExhaustedCount', 'p95DurationMs', 'status'],
                            },
                          },
                            required: ['oauth', 'webhookIngestion'],
                          },
                        artifactHealth: artifactHealthChecksSchema,
                        artifactHealthSummary: adminArtifactHealthSummarySchema,
                        slowestQueries: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              duration: { type: 'string' },
                              rowCount: { type: 'integer' },
                              query: { type: 'string' },
                              timestamp: { type: 'string', format: 'date-time' },
                            },
                            required: ['duration', 'query', 'timestamp'],
                          },
                        },
                        slowOperations: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              type: { type: 'string' },
                              message: { type: 'string' },
                              duration: { type: 'string' },
                              context: { type: 'object' },
                              timestamp: { type: 'string', format: 'date-time' },
                            },
                            required: ['type', 'message', 'duration', 'timestamp'],
                          },
                        },
                      },
                      required: ['timestamp', 'summary', 'serviceLevelObjectives', 'artifactHealth', 'artifactHealthSummary', 'slowestQueries', 'slowOperations'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '403': { description: 'Unauthorized' },
        },
      },
    },
    '/api/admin/performance/optimization': {
      get: {
        tags: ['Performance'],
        summary: 'Performance optimization recommendations for admins',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Optimization recommendations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'object',
                          properties: {
                            recommendations: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                                  title: { type: 'string' },
                                  description: { type: 'string' },
                                  action: { type: 'string' },
                                },
                                required: ['priority', 'title', 'description', 'action'],
                              },
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
                                strategies: {
                                  type: 'array',
                                  items: { type: 'string' },
                                },
                                strategiesCount: { type: 'integer' },
                              },
                              required: ['strategies', 'strategiesCount'],
                            },
                              indexSuggestions: {
                                type: 'array',
                                items: { type: 'string' },
                              },
                              artifactHealth: artifactHealthChecksSchema,
                              artifactHealthSummary: adminArtifactHealthSummarySchema,
                              slowOperations: {
                                type: 'array',
                                items: {
                                type: 'object',
                                properties: {
                                  type: { type: 'string' },
                                  message: { type: 'string' },
                                  duration: { type: 'integer' },
                                  timestamp: { type: 'number' },
                                },
                                required: ['type', 'message', 'duration', 'timestamp'],
                              },
                            },
                            timestamp: { type: 'string', format: 'date-time' },
                          },
                            required: ['recommendations', 'metrics', 'cacheStrategies', 'indexSuggestions', 'artifactHealth', 'artifactHealthSummary', 'slowOperations', 'timestamp'],
                          },
                      },
                      required: ['success', 'data'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/admin/system/artifact-health': {
      get: {
        tags: ['Health'],
        summary: 'Artifact health snapshot for admins',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Artifact freshness snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'object',
                          properties: {
                            summary: adminArtifactHealthSummarySchema,
                            artifacts: adminArtifactHealthSnapshotSchema,
                          },
                          required: ['summary', 'artifacts'],
                        },
                      },
                      required: ['success', 'data'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/admin/system/integration-settings': {
      get: {
        tags: ['Health'],
        summary: 'Admin integration settings and verification status',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Integration settings snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: integrationSettingsResponseSchema,
                      },
                      required: ['success', 'data'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '403': { description: 'Admin access required' },
          '429': { description: 'Rate limited' },
        },
      },
      put: {
        tags: ['Health'],
        summary: 'Update admin integration settings',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  resendApiKey: { type: 'string' },
                  analyticsId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated integration settings snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: integrationSettingsResponseSchema,
                      },
                      required: ['success', 'data'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '400': { description: 'Invalid payload' },
          '403': { description: 'Admin access required' },
          '422': { description: 'Validation error' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/api/admin/audit-logs': {
      get: {
        tags: ['Health'],
        summary: 'Admin audit logs and admin ops audit sink',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'source', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'offset', in: 'query', schema: { type: 'integer' } },
          { name: 'requestId', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv'] } },
        ],
        responses: {
          '200': {
            description: 'Audit logs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: adminAuditLogsDataSchema,
                  },
                  required: ['data'],
                },
              },
              'text/csv': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/admin/subscriptions/users': {
      get: {
        tags: ['Health'],
        summary: 'List users with subscriptions',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'tier', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Subscription users list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: subscriptionUsersListDataSchema,
                  },
                  required: ['data'],
                },
              },
            },
          },
          '403': { description: 'Admin access required' },
          '429': { description: 'Rate limited' },
        },
      },
      post: {
        tags: ['Health'],
        summary: 'Manage user subscription actions',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'action', in: 'query', required: true, schema: { type: 'string', enum: ['change_tier', 'get_details'] } },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  newTierId: { type: 'string' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Subscription management result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: subscriptionUsersMutationDataSchema,
                  },
                  required: ['data'],
                },
              },
            },
          },
          '400': { description: 'Invalid payload or action' },
          '403': { description: 'Admin access required' },
          '404': { description: 'Resource not found' },
          '422': { description: 'Validation error' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/api/admin/messages/{id}/status': {
      post: {
        tags: ['Health'],
        summary: 'Update contact message status',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['new', 'read', 'replied', 'archived'] },
                },
                required: ['status'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Message status updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: adminMessageStatusMutationDataSchema,
                  },
                  required: ['data'],
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '403': { description: 'Admin access required' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/api/admin/deployment/status': {
      get: {
        tags: ['Health'],
        summary: 'Deployment readiness and artifact health for admins',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Deployment status snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'object',
                          properties: {
                            environment: {
                              type: 'object',
                              properties: {
                                name: { type: 'string' },
                                url: { type: 'string' },
                                logLevel: { type: 'string' },
                                sslEnabled: { type: 'boolean' },
                                maintenanceMode: { type: 'boolean' },
                              },
                              required: ['name', 'url', 'logLevel', 'sslEnabled', 'maintenanceMode'],
                            },
                            readiness: { type: 'object' },
                            checklist: { type: 'object' },
                            integrations: {
                              type: 'object',
                              properties: {
                                resend: {
                                  type: 'object',
                                  properties: {
                                    configured: { type: 'boolean' },
                                    source: { type: 'string' },
                                  },
                                  required: ['configured', 'source'],
                                },
                                analytics: {
                                  type: 'object',
                                  properties: {
                                    configured: { type: 'boolean' },
                                    source: { type: 'string' },
                                  },
                                  required: ['configured', 'source'],
                                },
                                summary: {
                                  type: 'object',
                                  properties: {
                                    configuredCount: { type: 'integer' },
                                    total: { type: 'integer' },
                                    fullyConfigured: { type: 'boolean' },
                                  },
                                  required: ['configuredCount', 'total', 'fullyConfigured'],
                                },
                              },
                              required: ['resend', 'analytics', 'summary'],
                            },
                            artifactHealth: {
                              ...adminArtifactHealthSnapshotSchema,
                            },
                            artifactHealthSummary: adminArtifactHealthSummarySchema,
                            timestamp: { type: 'string', format: 'date-time' },
                          },
                          required: ['environment', 'readiness', 'checklist', 'integrations', 'artifactHealth', 'artifactHealthSummary', 'timestamp'],
                        },
                      },
                      required: ['success', 'data'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/admin/dashboard/overview': {
      get: {
        tags: ['Health'],
        summary: 'Admin dashboard overview with operational summaries',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Dashboard overview snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'object',
                          properties: {
                            integrations: {
                              type: 'object',
                              properties: {
                                resend: {
                                  type: 'object',
                                  properties: {
                                    configured: { type: 'boolean' },
                                    source: { type: 'string' },
                                  },
                                  required: ['configured', 'source'],
                                },
                                analytics: {
                                  type: 'object',
                                  properties: {
                                    configured: { type: 'boolean' },
                                    source: { type: 'string' },
                                  },
                                  required: ['configured', 'source'],
                                },
                                summary: integrationSummarySchema,
                                verification: integrationVerificationSchema,
                              },
                              required: ['resend', 'analytics', 'summary', 'verification'],
                            },
                            performanceOptimization: performanceOptimizationSummarySchema,
                            adminOpsAudit: adminOpsAuditSummarySchema,
                            artifactHealth: adminArtifactHealthSnapshotSchema,
                            artifactHealthSummary: adminArtifactHealthSummarySchema,
                            releaseGate: releaseGateSummarySchema,
                            nightly: {
                              type: 'object',
                              properties: {
                                regression: nightlySummarySchema,
                                e2e: nightlySummarySchema,
                              },
                              required: ['regression', 'e2e'],
                            },
                            statusSummary: adminStatusSummarySchema,
                            period: { type: 'integer' },
                          },
                          required: ['integrations', 'performanceOptimization', 'adminOpsAudit', 'artifactHealth', 'artifactHealthSummary', 'releaseGate', 'nightly', 'statusSummary', 'period'],
                        },
                      },
                      required: ['success', 'data'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '403': { description: 'Admin access required' },
        },
      },
    },
    '/api/admin/system/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Admin system metrics and operational health snapshot',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'System metrics snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        data: {
                          type: 'object',
                          properties: {
                            health: {
                              type: 'object',
                              properties: {
                                status: healthStatusSchema,
                                timestamp: { type: 'string', format: 'date-time' },
                                integrations: {
                                  type: 'object',
                                  properties: {
                                    resend: {
                                      type: 'object',
                                      properties: {
                                        configured: { type: 'boolean' },
                                        source: { type: 'string' },
                                      },
                                      required: ['configured', 'source'],
                                    },
                                    analytics: {
                                      type: 'object',
                                      properties: {
                                        configured: { type: 'boolean' },
                                        source: { type: 'string' },
                                      },
                                      required: ['configured', 'source'],
                                    },
                                    summary: integrationSummarySchema,
                                  },
                                  required: ['resend', 'analytics', 'summary'],
                                },
                              },
                              required: ['status', 'timestamp', 'integrations'],
                            },
                            performanceOptimization: performanceOptimizationSummarySchema,
                            adminOpsAudit: adminOpsAuditSummarySchema,
                            artifactHealth: adminArtifactHealthSnapshotSchema,
                            artifactHealthSummary: adminArtifactHealthSummarySchema,
                            nightly: {
                              type: 'object',
                              properties: {
                                regression: nightlySummarySchema,
                                e2e: nightlySummarySchema,
                              },
                              required: ['regression', 'e2e'],
                            },
                            releaseGate: releaseGateSummarySchema,
                            statusSummary: adminStatusSummarySchema,
                          },
                          required: ['health', 'performanceOptimization', 'adminOpsAudit', 'artifactHealth', 'artifactHealthSummary', 'nightly', 'releaseGate', 'statusSummary'],
                        },
                      },
                      required: ['success', 'data'],
                    },
                  },
                  required: ['data'],
                },
              },
            },
          },
          '403': { description: 'Admin access required' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(openApiSpec), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
