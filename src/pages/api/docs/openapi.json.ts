import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { getPublicAppUrl } from '../../../lib/public-app-url';

const API_ROOT = path.join(process.cwd(), 'src', 'pages', 'api');
const PUBLIC_APP_URL = getPublicAppUrl();

function walkApiFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkApiFiles(full));
      continue;
    }
    if (!/\.(ts|js|mjs)$/.test(entry.name)) continue;
    if (full.endsWith(path.join('docs', 'openapi.json.ts'))) continue;
    files.push(full);
  }
  return files;
}

function filePathToRoute(filePath: string): string {
  const rel = path.relative(API_ROOT, filePath).replace(/\\/g, '/');
  let route = `/${rel.replace(/\.(ts|js|mjs)$/, '')}`;
  route = route.replace(/\/index$/, '');
  route = route.replace(/\[\.\.\.([^\]]+)\]/g, '{$1}');
  route = route.replace(/\[([^\]]+)\]/g, '{$1}');
  return route === '' ? '/' : route;
}

function discoverApiRoutes(): string[] {
  return walkApiFiles(API_ROOT).map(filePathToRoute);
}

export const GET: APIRoute = async () => {
  const standardErrorResponses = {
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
      },
    },
    '500': {
      description: 'Server error',
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
      },
    },
  };

  const buildGetPath = (summary: string, tag: string, secure = false) => ({
    get: {
      summary,
      tags: [tag],
      ...(secure ? { security: [{ bearerAuth: [] }] } : {}),
      responses: {
        '200': {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: { type: 'object' },
                },
              },
            },
          },
        },
        ...standardErrorResponses,
      },
    },
  });

  const buildPostPath = (summary: string, tag: string, secure = false) => ({
    post: {
      summary,
      tags: [tag],
      ...(secure ? { security: [{ bearerAuth: [] }] } : {}),
      responses: {
        '200': {
          description: 'Operation successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        ...standardErrorResponses,
      },
    },
  });

  // P1 OpenAPI gap closure set (high-priority endpoints tracked in docs/openapi-coverage-plan.md)
  const p1CoveragePaths = {
    '/places': buildGetPath('List places', 'Places'),
    '/places/{id}/analytics': buildGetPath('Place analytics', 'Places'),
    '/places/{id}/badges': buildGetPath('Place badges', 'Places'),
    '/health': buildGetPath('Service healthcheck (DB + Redis + integrations summary). Returns 200 when DB is reachable, 503 otherwise.', 'System'),
    '/health/schema-ready': buildGetPath('Database schema readiness probe (used by deploy gates)', 'System'),
    '/version': buildGetPath('API version + docs links', 'System'),
    '/metrics': buildGetPath('Prometheus-style request metrics (latency, error rate)', 'System'),
    '/performance': buildGetPath('Server performance snapshot (uptime, memory, load)', 'System'),
    '/docs': buildGetPath('OpenAPI documentation HTML viewer', 'System'),
    '/activity': buildGetPath('Activity stream (recent platform events)', 'System'),
    '/analytics': buildGetPath('Aggregate platform analytics (page views, event counts)', 'System'),
    '/leaderboard': buildGetPath('Top users / places by points (gamification)', 'System'),
    '/contact': {
      get: buildGetPath('List contact form submissions (admin only)', 'System', true).get,
      post: buildPostPath('Submit a contact form message', 'System').post,
    },
    '/flags': {
      get: buildGetPath('List feature flags', 'System', true).get,
      post: buildPostPath('Toggle a feature flag (admin only)', 'System', true).post,
    },
    '/graphql': {
      get: buildGetPath('GraphQL schema introspection (if enabled)', 'System').get,
      post: buildPostPath('GraphQL query / mutation', 'System').post,
    },
    '/places/{id}/review-analytics': buildGetPath('Place review analytics', 'Places'),
    '/search/advanced': buildGetPath('Advanced search', 'Search'),
    '/search/recommendations': buildGetPath('Search recommendations', 'Search'),
    '/users/profile': buildGetPath('Get current user profile', 'Users', true),
    '/users/preferences': buildGetPath('Get user preferences', 'Users', true),
    '/users/email-preferences': buildGetPath('Get user email preferences', 'Users', true),
    '/users/{id}/profile': buildGetPath('Get public user profile', 'Users'),
    '/auth/login': buildPostPath('User login', 'Authentication'),
    '/auth/register': buildPostPath('User registration', 'Authentication'),
    '/auth/login/verify-2fa': buildPostPath('Verify login 2FA code', 'Authentication'),
    '/favorites': buildGetPath('Get user favorites', 'Favorites', true),
    '/favorites/bulk': buildPostPath('Bulk favorite action', 'Favorites', true),
    '/notifications': buildGetPath('Get notifications', 'Notifications', true),
    '/notifications/unsubscribe': buildPostPath('Unsubscribe notifications', 'Notifications'),
    '/blog/posts': buildGetPath('List blog posts', 'Blog'),
    '/blog/posts/{slug}': buildGetPath('Get blog post by slug', 'Blog'),
    '/events/{id}/details': buildGetPath('Get event details', 'Events'),
  };

  const siteAndSocialCoveragePaths = {
    '/social/follow': buildPostPath('Follow or unfollow user', 'Social', true),
    '/social/messages': {
      get: {
        summary: 'Get social conversations/messages',
        tags: ['Social'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          ...standardErrorResponses,
        },
      },
      post: {
        summary: 'Send social message / execute social message action',
        tags: ['Social'],
        security: [{ bearerAuth: [] }],
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          ...standardErrorResponses,
        },
      },
    },
    '/social/events/stream': buildGetPath('Get social events stream (SSE)', 'Social', true),
    '/social/swipe': buildPostPath('Swipe match action', 'Social', true),
    '/social/match-profile': {
      get: buildGetPath('Get match profile', 'Social', true).get,
      post: buildPostPath('Update match profile', 'Social', true).post,
    },
    '/social/match-candidates': buildGetPath('Get match candidates', 'Social', true),
    '/social/matches': buildGetPath('Get user matches', 'Social', true),
    '/admin/site/audit': buildGetPath('Get site change audit timeline', 'Admin', true),
    '/admin/site/audit/export': buildGetPath('Export site audit as CSV', 'Admin', true),
    '/admin/site/settings': {
      get: buildGetPath('Get site setting', 'Admin', true).get,
      put: buildPostPath('Save/publish site setting', 'Admin', true).post,
    },
    '/admin/site/settings/diff': buildGetPath('Compare site setting versions', 'Admin', true),
    '/admin/site/settings/rollback': buildPostPath('Rollback site setting version', 'Admin', true),
    '/admin/site/media': {
      get: buildGetPath('List site media assets', 'Admin', true).get,
      delete: {
        summary: 'Delete site media asset',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Deleted',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
          ...standardErrorResponses,
        },
      },
    },
    '/admin/site/media/import': buildPostPath('Import media asset to site library', 'Admin', true),
    '/admin/site/media/search': buildGetPath('Search media provider assets', 'Admin', true),
    '/admin/site/integrations': {
      get: buildGetPath('Get all admin-managed integrations (email, analytics, payment, image providers, OAuth)', 'Admin', true).get,
      post: buildPostPath('Save integration credentials for one section', 'Admin', true).post,
    },
    '/admin/site/integrations/test': buildPostPath('Probe a saved integration (sends test email / hits provider API)', 'Admin', true),
    '/admin/city-content-agents': {
      get: {
        summary: 'List city content agents, sources, jobs and filtered drafts',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            description: 'Taslak moderasyon durumuna göre filtreler',
          },
          {
            name: 'draftType',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['place-discovery-draft', 'place-update-draft', 'seo-override-draft'],
            },
            description: 'Taslak tipine göre filtreler',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
            description: 'Dönen taslak sayısı; sunucu tarafında 1-500 aralığına sıkıştırılır',
          },
          {
            name: 'offset',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 0, default: 0 },
            description: 'Sayfalama başlangıç konumu',
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        success: { type: 'boolean' },
                        agents: { type: 'array', items: { type: 'object' } },
                        sources: { type: 'array', items: { type: 'object' } },
                        jobs: { type: 'array', items: { type: 'object' } },
                        drafts: { type: 'array', items: { type: 'object' } },
                        draftSummary: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer' },
                            byStatus: {
                              type: 'object',
                              additionalProperties: { type: 'integer' },
                            },
                            byType: {
                              type: 'object',
                              additionalProperties: { type: 'integer' },
                            },
                          },
                        },
                        policy: {
                          type: 'object',
                          properties: {
                            autoPublish: { type: 'boolean', example: false },
                            language: { type: 'string', example: 'tr' },
                            focusKeyword: { type: 'string', example: 'Şanlıurfa' },
                            sourcePolicy: { type: 'string' },
                          },
                        },
                      },
                    },
                    meta: { type: 'object' },
                  },
                },
              },
            },
          },
          ...standardErrorResponses,
        },
      },
      post: buildPostPath('Run city content agent or moderate draft', 'Admin', true).post,
    },
    '/admin/social/events': buildGetPath('Get unified social events timeline', 'Admin', true),
    '/admin/places/lifecycle': buildGetPath('Get place lifecycle timeline', 'Admin', true),
    '/admin/places/lifecycle/sla': buildGetPath('Get place lifecycle SLA summary', 'Admin', true),
  };

  const generatedDomainPaths = {
    ...p1CoveragePaths,
    ...siteAndSocialCoveragePaths,
    '/auth/callback': buildGetPath('OAuth callback handler', 'Authentication'),
    '/auth/login/verify-2fa': buildPostPath('Verify login 2FA code', 'Authentication'),
    '/auth/oauth/authorize': buildGetPath('Authorize OAuth provider', 'Authentication'),
    '/auth/oauth/callback': buildGetPath('OAuth provider callback', 'Authentication'),
    '/auth/oauth/unlink': buildPostPath('Unlink OAuth account', 'Authentication', true),
    '/auth/social/facebook': buildPostPath('Login with Facebook', 'Authentication'),

    '/search/recommendations': buildGetPath('Search recommendations', 'Search'),
    '/search/saved': buildGetPath('Saved searches', 'Search', true),
    '/search/history/{id}': buildGetPath('Get search history detail', 'Search', true),

    '/user/features': buildGetPath('Get user feature flags', 'Users', true),
    '/user/loyalty': buildGetPath('Get user loyalty snapshot', 'Users', true),
    '/user/quotas': buildGetPath('Get user quotas', 'Users', true),
    '/user/subscription/billing': buildGetPath('Get user billing details', 'Subscriptions', true),
    '/user/visits': buildGetPath('Get user visits', 'Users', true),
    '/user/following/places': buildGetPath('Get followed places', 'Users', true),

    '/admin/alerts': buildGetPath('Admin alerts', 'Admin', true),
    '/admin/audit-logs': buildGetPath('Admin audit logs', 'Admin', true),
    '/admin/bulk-action': buildPostPath('Admin bulk action', 'Admin', true),
    '/admin/flags': buildGetPath('Admin flags', 'Admin', true),
    '/admin/import': buildPostPath('Admin import operation', 'Admin', true),
    '/admin/moderation': buildGetPath('Admin moderation overview', 'Admin', true),
    '/admin/monitoring': buildGetPath('Admin monitoring overview', 'Admin', true),
    '/admin/places': buildGetPath('Admin places management', 'Admin', true),
    '/admin/events/submissions': {
      get: buildGetPath('Admin event submissions queue', 'Admin', true).get,
      post: buildPostPath('Approve or reject event submission', 'Admin', true).post,
    },
    '/admin/revenue': buildGetPath('Admin revenue metrics', 'Admin', true),
    '/admin/blog': buildGetPath('Admin blog management', 'Admin', true),
    '/admin/blog/categories': buildGetPath('Admin blog categories', 'Admin', true),
    '/admin/blog/stats': buildGetPath('Admin blog statistics', 'Admin', true),
    '/admin/blog/tags': buildGetPath('Admin blog tags', 'Admin', true),
    '/admin/blog/{id}': buildGetPath('Admin blog detail', 'Admin', true),
    '/admin/dashboard/overview': buildGetPath('Admin dashboard overview', 'Admin', true),
    '/admin/deployment/status': buildGetPath('Admin deployment status', 'Admin', true),
    '/admin/loyalty/award': buildPostPath('Award loyalty points', 'Admin', true),
    '/admin/loyalty/rewards': buildGetPath('Manage loyalty rewards', 'Admin', true),
    '/admin/messages/{id}/status': buildPostPath('Update admin message status', 'Admin', true),
    '/admin/moderation/actions': buildPostPath('Execute moderation action', 'Admin', true),
    '/admin/moderation/flags': buildGetPath('Moderation flags list', 'Admin', true),
    '/admin/moderation/queue': buildGetPath('Moderation queue', 'Admin', true),
    '/admin/moderation/reports': buildGetPath('Moderation reports', 'Admin', true),
    '/admin/moderation/stats': buildGetPath('Moderation statistics', 'Admin', true),
    '/admin/monitoring/dashboard': buildGetPath('Monitoring dashboard', 'Admin', true),
    '/admin/performance/recommendations': buildGetPath(
      'Performance recommendations',
      'Admin',
      true
    ),
    '/admin/performance/summary': buildGetPath('Performance summary', 'Admin', true),
    '/admin/places/create': buildPostPath('Create place from admin panel', 'Admin', true),
    '/admin/quotas/{userId}': buildGetPath('Admin user quota detail', 'Admin', true),
    '/admin/reports/generate': buildPostPath('Generate admin report', 'Admin', true),
    '/admin/reports/schedule': buildPostPath('Schedule admin report', 'Admin', true),
    '/admin/security/audit': buildGetPath('Admin security audit', 'Admin', true),
    '/admin/security/guidelines': buildGetPath('Admin security guidelines', 'Admin', true),
    '/admin/subscriptions/analytics': buildGetPath('Subscription analytics', 'Admin', true),
    '/admin/subscriptions/users': buildGetPath('Subscription users list', 'Admin', true),
    '/admin/system/metrics': buildGetPath('System metrics', 'Admin', true),
    '/admin/users/{id}': buildGetPath('Admin user detail', 'Admin', true),
    '/admin/vendor/pending': buildGetPath('Pending vendor approvals', 'Admin', true),
    '/admin/vendor/{id}/approve': buildPostPath('Approve vendor', 'Admin', true),
    '/admin/vendor/{id}/reject': buildPostPath('Reject vendor', 'Admin', true),
    '/admin/verifications': buildGetPath('Verification queue', 'Admin', true),
    '/admin/verifications/{id}/approve': buildPostPath('Approve verification', 'Admin', true),
    '/admin/verifications/{id}/reject': buildPostPath('Reject verification', 'Admin', true),
    '/admin/badges/award': buildPostPath('Award badge to user', 'Admin', true),
    '/admin/content-bot/generate': buildPostPath('Generate content with admin bot', 'Admin', true),

    '/users/2fa/setup': buildPostPath('Setup user 2FA', 'Users', true),
    '/users/2fa/verify': buildPostPath('Verify user 2FA code', 'Users', true),
    '/users/2fa/disable': buildPostPath('Disable user 2FA', 'Users', true),
    '/users/2fa/status': buildGetPath('Get user 2FA status', 'Users', true),
    '/users/preferences': buildGetPath('Get user preferences', 'Users', true),
    '/users/settings': buildGetPath('Get user settings', 'Users', true),
    '/users/stats': buildGetPath('Get user stats', 'Users', true),
    '/users/stats/badges': buildGetPath('Get user badge stats', 'Users', true),
    '/users/suggestions': buildGetPath('Get user suggestions', 'Users', true),
    '/users/trending': buildGetPath('Get trending users', 'Users', false),
    '/users/search': buildGetPath('Search users', 'Users', true),
    '/users/saved-searches': buildGetPath('Get user saved searches', 'Users', true),
    '/users/saved-searches/{id}': buildGetPath('Get saved search detail', 'Users', true),
    '/users/password': buildPostPath('Update user password', 'Users', true),
    '/users/email-preferences': buildGetPath('Get email preferences', 'Users', true),
    '/users/points-history': buildGetPath('Get points history', 'Users', true),
    '/users/verify-email': buildPostPath('Verify user email', 'Users', false),
    '/users/resend-verification': buildPostPath('Resend verification email', 'Users', false),
    '/users/deletion/request': buildPostPath('Request account deletion', 'Users', true),
    '/users/deletion/status': buildGetPath('Get account deletion status', 'Users', true),
    '/users/deletion/cancel': buildPostPath('Cancel account deletion request', 'Users', true),
    '/users/privacy': buildGetPath('Get privacy settings', 'Users', true),
    '/users/privacy/block': buildPostPath('Block user', 'Users', true),
    '/users/privacy/mute': buildPostPath('Mute user', 'Users', true),
    '/users/privacy/delete-account': buildPostPath('Delete account', 'Users', true),
    '/users/profile': buildGetPath('Get current user profile', 'Users', true),
    '/users/{id}': buildGetPath('Get user by id', 'Users', true),
    '/users/{id}/profile': buildGetPath('Get user public profile', 'Users', false),
    '/users/{id}/badges': buildGetPath('Get user badges', 'Users', false),
    '/users/{id}/mentions': buildGetPath('Get user mentions', 'Users', true),
    '/users/{id}/reputation': buildGetPath('Get user reputation', 'Users', false),
    '/users/{id}/activity-stats': buildGetPath('Get user activity stats', 'Users', false),
    '/users/{id}/update-role': buildPostPath('Update user role', 'Users', true),
    '/users/{id}/ban': buildPostPath('Ban user', 'Users', true),
    '/users/{id}/delete': buildPostPath('Delete user by id', 'Users', true),

    '/notifications': buildGetPath('Get notifications', 'Notifications', true),
    '/notifications/center': buildGetPath('Get notification center', 'Notifications', true),
    '/notifications/clear': buildPostPath('Clear notifications', 'Notifications', true),
    '/notifications/draft': buildPostPath('Create notification draft', 'Notifications', true),
    '/notifications/drafts': buildGetPath('List notification drafts', 'Notifications', true),
    '/notifications/drafts/{id}': buildGetPath('Get notification draft detail', 'Notifications', true),
    '/notifications/history': buildGetPath('Get notification history', 'Notifications', true),
    '/notifications/mark-all-read': buildPostPath('Mark all notifications read', 'Notifications', true),
    '/notifications/preferences': buildGetPath('Get notification preferences', 'Notifications', true),
    '/notifications/push/subscribe': buildPostPath('Subscribe push notifications', 'Notifications', true),
    '/notifications/read-all': buildPostPath('Read all notifications', 'Notifications', true),
    '/notifications/send': buildPostPath('Send notification', 'Notifications', true),
    '/notifications/sse': buildGetPath('Notification SSE stream', 'Notifications', true),
    '/notifications/stats': buildGetPath('Get notification stats', 'Notifications', true),
    '/notifications/subscribe': buildPostPath('Subscribe notifications', 'Notifications', true),
    '/notifications/unsubscribe': buildPostPath('Unsubscribe notifications', 'Notifications', true),
    '/notifications/vapid-key': buildGetPath('Get VAPID public key', 'Notifications', false),
    '/notifications/{id}': buildGetPath('Get notification detail', 'Notifications', true),
    '/notifications/{id}/read': buildPostPath('Mark notification as read', 'Notifications', true),

    '/webhooks': buildGetPath('List webhooks', 'Webhooks', true),
    '/webhooks/analytics': buildGetPath('Webhook analytics', 'Webhooks', true),
    '/webhooks/audit': buildGetPath('Webhook audit log', 'Webhooks', true),
    '/webhooks/filters': buildGetPath('Webhook filters', 'Webhooks', true),
    '/webhooks/logs': buildGetPath('Webhook logs', 'Webhooks', true),
    '/webhooks/replay': buildPostPath('Replay webhook event', 'Webhooks', true),
    '/webhooks/retry': buildPostPath('Retry webhook delivery', 'Webhooks', true),
    '/webhooks/settings': buildGetPath('Webhook settings', 'Webhooks', true),
    '/webhooks/stripe': buildPostPath('Stripe webhook receiver', 'Webhooks', false),
    '/webhooks/templates': buildGetPath('Webhook templates', 'Webhooks', true),
    '/webhooks/test': buildPostPath('Test webhook', 'Webhooks', true),
    '/webhooks/trigger': buildPostPath('Trigger webhook', 'Webhooks', true),
    '/webhooks/{id}': buildGetPath('Get webhook by id', 'Webhooks', true),

    '/realtime/analytics': buildGetPath('Realtime analytics stream', 'Realtime', true),
    '/realtime/feed': buildGetPath('Realtime activity feed', 'Realtime', true),
    '/realtime/messages': buildGetPath('Realtime messages stream', 'Realtime', true),
    '/realtime/notifications': buildGetPath('Realtime notifications stream', 'Realtime', true),
    '/realtime/presence': buildGetPath('Realtime user presence', 'Realtime', true),
  };

  const autoDiscoveredPaths = Object.fromEntries(
    discoverApiRoutes()
      .filter((route) => !(generatedDomainPaths as Record<string, unknown>)[route])
      .map((route) => [route, buildGetPath(`Auto-discovered route: ${route}`, 'Auto')]),
  );

  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'Sanliurfa.com API',
      description: 'REST API for Sanliurfa.com - Travel Guide Platform',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'api@sanliurfa.com',
      },
    },
    servers: [
      {
        url: `${PUBLIC_APP_URL}/api`,
        description: 'Production server',
      },
      {
        url: 'http://localhost:4321/api',
        description: 'Development server',
      },
    ],
    paths: {
      ...generatedDomainPaths,
      ...autoDiscoveredPaths,
      '/auth/login': {
        post: {
          summary: 'User login',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      token: { type: 'string' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
      },
      '/auth/register': {
        post: {
          summary: 'User registration',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    name: { type: 'string', minLength: 2 },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Registration successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthRegisterResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '409': {
              description: 'User already exists',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
      },
      '/auth/me': {
        get: {
          summary: 'Get current authenticated user',
          tags: ['Authentication'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Current user profile',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/auth/logout': {
        post: {
          summary: 'Logout current user',
          tags: ['Authentication'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Logout successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/auth/forgot-password': {
        post: {
          summary: 'Request password reset',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Reset flow started',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/auth/reset-password': {
        post: {
          summary: 'Reset password with token',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token', 'password'],
                  properties: {
                    token: { type: 'string' },
                    password: { type: 'string', minLength: 6 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Password reset successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/auth/2fa/setup': {
        post: {
          summary: 'Setup two-factor authentication',
          tags: ['Authentication'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: '2FA setup payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      secret: { type: 'string' },
                      qrCode: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/auth/2fa/verify': {
        post: {
          summary: 'Verify two-factor authentication code',
          tags: ['Authentication'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code'],
                  properties: {
                    code: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: '2FA verification result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      verified: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/auth/2fa/disable': {
        post: {
          summary: 'Disable two-factor authentication',
          tags: ['Authentication'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: '2FA disabled',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places': {
        get: {
          summary: 'List places',
          tags: ['Places'],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'lat', in: 'query', schema: { type: 'number' } },
            { name: 'lon', in: 'query', schema: { type: 'number' } },
            { name: 'radius', in: 'query', schema: { type: 'number', description: 'Radius in km' } },
          ],
          responses: {
            '200': {
              description: 'List of places',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      places: { type: 'array', items: { $ref: '#/components/schemas/Place' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
        post: {
          summary: 'Create new place',
          tags: ['Places'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PlaceInput' },
              },
            },
          },
          responses: {
            '201': { description: 'Place created' },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
      },
      '/places/{id}': {
        get: {
          summary: 'Get place by ID',
          tags: ['Places'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Place details',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Place' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '404': {
              description: 'Place not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/photos': {
        get: {
          summary: 'Get place photos',
          tags: ['Places'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: {
            '200': {
              description: 'Place photos',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlacePhotosResponse' },
                },
              },
            },
            '404': {
              description: 'Place not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/followers': {
        get: {
          summary: 'Get place followers',
          tags: ['Places'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: {
            '200': {
              description: 'Followers list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean', example: true },
                          followers: { type: 'array', items: { type: 'object' } },
                          count: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Place not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/like': {
        get: {
          summary: 'Get place like stats',
          tags: ['Places'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Like stats',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceLikeGetResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
        post: {
          summary: 'Like or unlike place',
          tags: ['Places'],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', enum: ['like', 'unlike'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Like status updated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceLikeMutationResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/share': {
        get: {
          summary: 'Get place share stats',
          tags: ['Places'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Share stats',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceShareGetResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
        post: {
          summary: 'Share place',
          tags: ['Places'],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    platform: { type: 'string' },
                    share_url: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Place shared',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceSharePostResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/visit': {
        post: {
          summary: 'Record place visit',
          tags: ['Places'],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    visitedAt: { type: 'string', format: 'date-time' },
                    notes: { type: 'string' },
                    rating: { type: 'number' },
                    durationMinutes: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Visit recorded',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          success: { type: 'boolean', example: true },
                          message: { type: 'string' },
                          visit: { $ref: '#/components/schemas/VisitRecord' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '404': {
              description: 'Place not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/follow': {
        post: {
          summary: 'Follow place',
          tags: ['Places'],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '201': {
              description: 'Place followed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceFollowResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '404': {
              description: 'Place not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '409': {
              description: 'Already following',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '500': {
              description: 'Server error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
        delete: {
          summary: 'Unfollow place',
          tags: ['Places'],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Place unfollowed',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceFollowResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '404': {
              description: 'Not following / place not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '500': {
              description: 'Server error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/places/{id}/verification': {
        get: {
          summary: 'Get place verification status',
          tags: ['Places'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Verification status',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceVerificationResponse' },
                },
              },
            },
            '404': {
              description: 'Place not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '500': {
              description: 'Server error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/places/{id}/badges': {
        get: {
          summary: 'Get place badges',
          tags: ['Places'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Place badges',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceBadgesResponse' },
                },
              },
            },
            '404': {
              description: 'Place not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/analytics': {
        get: {
          summary: 'Get place analytics',
          tags: ['Places'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'days', in: 'query', schema: { type: 'integer', default: 30, maximum: 365 } },
          ],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Place analytics',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceAnalyticsResponse' },
                },
              },
            },
            '403': {
              description: 'Forbidden',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '404': {
              description: 'Place not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/availability': {
        get: {
          summary: 'Get place availability',
          tags: ['Places'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            {
              name: 'date',
              in: 'query',
              required: true,
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            },
          ],
          responses: {
            '200': {
              description: 'Availability response',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceAvailabilityResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '404': {
              description: 'Place not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/promotions': {
        get: {
          summary: 'Get place promotions',
          tags: ['Places'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Promotions list',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlacePromotionsResponse' },
                },
              },
            },
            '404': {
              description: 'Place not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/{id}/review-analytics': {
        get: {
          summary: 'Get place review analytics',
          tags: ['Places'],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Review analytics',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceReviewAnalyticsResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '401': {
              description: 'Unauthorized',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '403': {
              description: 'Forbidden',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '500': {
              description: 'Server error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/places/{id}/rating-distribution': {
        get: {
          summary: 'Get place rating distribution',
          tags: ['Places'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Rating distribution',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceRatingDistributionResponse' },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/places/{id}/request-verification': {
        post: {
          summary: 'Request place verification',
          tags: ['Places'],
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    documents: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Verification requested',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceRequestVerificationResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '404': {
              description: 'Place not found',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '409': {
              description: 'Conflict',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '500': {
              description: 'Server error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/search': {
        get: {
          summary: 'Search places, events, blog posts',
          tags: ['Search'],
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['place', 'event', 'blog'] } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          ],
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results: { type: 'array', items: { type: 'object' } },
                      total: { type: 'integer' },
                      facets: { type: 'object' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/upload': {
        post: {
          summary: 'Upload file',
          tags: ['Upload'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: { type: 'string', format: 'binary' },
                    placeId: { type: 'string' },
                    type: { type: 'string', enum: ['cover', 'gallery'], default: 'gallery' },
                    caption: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'File uploaded',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      photo: { $ref: '#/components/schemas/UploadPhoto' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
        get: {
          summary: 'List place photos',
          tags: ['Upload'],
          parameters: [
            { name: 'placeId', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Place photos',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      photos: { type: 'array', items: { $ref: '#/components/schemas/UploadPhoto' } },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
      },
      '/upload/{id}': {
        put: {
          summary: 'Update photo metadata',
          tags: ['Upload'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    caption: { type: 'string' },
                    isPrimary: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Photo updated',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      photo: { $ref: '#/components/schemas/UploadPhoto' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
        delete: {
          summary: 'Delete photo',
          tags: ['Upload'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Photo deleted' },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
      },
      '/featured-listings': {
        get: {
          summary: 'List featured listings',
          tags: ['Featured Listings'],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
            { name: 'my', in: 'query', schema: { type: 'boolean', default: false } },
          ],
          responses: {
            '200': {
              description: 'Featured listings',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        oneOf: [
                          {
                            type: 'array',
                            items: { $ref: '#/components/schemas/FeaturedListing' },
                          },
                          {
                            type: 'object',
                            properties: {
                              listings: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/FeaturedListing' },
                              },
                              total: { type: 'integer' },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
        post: {
          summary: 'Create featured listing',
          tags: ['Featured Listings'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['place_id', 'title', 'position_tier', 'start_date', 'end_date'],
                  properties: {
                    place_id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    featured_image_url: { type: 'string' },
                    position_tier: { type: 'string' },
                    start_date: { type: 'string', format: 'date-time' },
                    end_date: { type: 'string', format: 'date-time' },
                    cost_per_day: { type: 'number' },
                    settings: { type: 'object' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Featured listing created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/FeaturedListing' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/user/favorites': {
        get: {
          summary: 'Get user favorites',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'User favorites',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UserFavoritesResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
        post: {
          summary: 'Add place to favorites',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['placeId'],
                  properties: {
                    placeId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Added to favorites' },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
        delete: {
          summary: 'Remove place from user_favorites',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'placeId', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Removed from user_favorites' },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
      },
      '/user/profile': {
        get: {
          summary: 'Get current user profile',
          tags: ['Users'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'User profile payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      profile: { type: 'object' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/user/subscription': {
        get: {
          summary: 'Get current user subscription',
          tags: ['Subscriptions'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Subscription payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      subscription: { type: 'object', nullable: true },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/v2/favorites': {
        get: {
          summary: 'Mobile favorites list',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Mobile favorites',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'array', items: { $ref: '#/components/schemas/FavoritePlace' } },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorFlagged' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorFlagged' } },
              },
            },
          },
        },
        post: {
          summary: 'Mobile add favorite',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['place_id'],
                  properties: {
                    place_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Added to favorites' },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorFlagged' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorFlagged' } },
              },
            },
          },
        },
        delete: {
          summary: 'Mobile remove favorite',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'place_id', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Removed from user_favorites' },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorFlagged' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorFlagged' } },
              },
            },
          },
        },
      },
      '/user/following/places': {
        get: {
          summary: 'Get places followed by user',
          tags: ['Following'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          ],
          responses: {
            '200': {
              description: 'Followed places',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      places: { type: 'array', items: { $ref: '#/components/schemas/FollowedPlace' } },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/places/trending-followers': {
        get: {
          summary: 'Most followed places',
          tags: ['Places'],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            '200': {
              description: 'Trending places by follower count',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      places: { type: 'array', items: { $ref: '#/components/schemas/FollowedPlace' } },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/user/visits': {
        get: {
          summary: 'Get user visit history',
          tags: ['Visits'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'includeStats', in: 'query', schema: { type: 'boolean', default: false } },
            { name: 'includeMostVisited', in: 'query', schema: { type: 'boolean', default: false } },
          ],
          responses: {
            '200': {
              description: 'Visit history',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      visits: { type: 'array', items: { $ref: '#/components/schemas/VisitRecord' } },
                      stats: { $ref: '#/components/schemas/VisitStats' },
                      mostVisited: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/MostVisitedPlace' },
                      },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/dashboard': {
        get: {
          summary: 'Admin dashboard metrics',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Dashboard payload',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AdminDashboardResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorBasic' } },
              },
            },
          },
        },
      },
      '/admin/analytics': {
        get: {
          summary: 'Admin analytics summary',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Admin analytics payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      metrics: { type: 'object' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/users': {
        get: {
          summary: 'Admin users list',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Admin users payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/recommendations/hybrid': {
        get: {
          summary: 'Hybrid recommendations',
          tags: ['Recommendations'],
          parameters: [
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['hybrid', 'content', 'collaborative', 'trending'] },
            },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: {
            '200': {
              description: 'Recommendation results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/RecommendationPlace' },
                      },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/search/advanced': {
        get: {
          summary: 'Advanced AI-ranked search',
          tags: ['Search'],
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'minRating', in: 'query', schema: { type: 'number', default: 0 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': {
              description: 'Advanced search results',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SearchAdvancedResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/search/suggestions': {
        get: {
          summary: 'Search query suggestions',
          tags: ['Search'],
          parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Search suggestions payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/search/trending': {
        get: {
          summary: 'Trending search terms',
          tags: ['Search'],
          responses: {
            '200': {
              description: 'Trending search terms',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/search/history': {
        get: {
          summary: 'Current user search history',
          tags: ['Search'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Search history payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/billing/checkout': {
        post: {
          summary: 'Create billing checkout subscription',
          tags: ['Payments'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tier', 'priceId'],
                  properties: {
                    tier: { type: 'string', enum: ['premium', 'pro'] },
                    priceId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Checkout subscription created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          subscriptionId: { type: 'string' },
                          clientSecret: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '404': {
              description: 'Not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '422': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/subscriptions/checkout': {
        post: {
          summary: 'Create Stripe checkout session',
          tags: ['Payments'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tierId'],
                  properties: {
                    tierId: { type: 'string', minLength: 36, maxLength: 36 },
                    billingCycle: { type: 'string', enum: ['monthly', 'annual'] },
                    successUrl: { type: 'string' },
                    cancelUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Checkout session created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      sessionId: { type: 'string' },
                      checkoutUrl: { type: 'string' },
                      tier: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          displayName: { type: 'string' },
                          price: { type: 'number' },
                          billingCycle: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '404': {
              description: 'Not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '422': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/subscriptions/tiers': {
        get: {
          summary: 'List subscription tiers',
          tags: ['Payments'],
          responses: {
            '200': {
              description: 'Subscription tiers',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      tiers: { type: 'array', items: { type: 'object' } },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/social/events': {
        get: {
          summary: 'Get unified social events timeline',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Social events timeline',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SocialEventsResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/social/events/stream': {
        get: {
          summary: 'Stream social events timeline (SSE)',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'SSE stream',
              content: {
                'text/event-stream': {
                  schema: { type: 'string' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/places/lifecycle': {
        get: {
          summary: 'Get place lifecycle timeline',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Lifecycle timeline',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceLifecycleTimelineResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/places/lifecycle/sla': {
        get: {
          summary: 'Get place lifecycle SLA summary',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'SLA summary',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/PlaceLifecycleSlaResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/social/events/export': {
        get: {
          summary: 'Export social events as CSV',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'CSV export',
              content: {
                'text/csv': {
                  schema: { type: 'string' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/places/lifecycle/export': {
        get: {
          summary: 'Export place lifecycle events as CSV',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'CSV export',
              content: {
                'text/csv': {
                  schema: { type: 'string' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/reports/social-lifecycle': {
        get: {
          summary: 'Generate social + lifecycle summary report',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Report data',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SocialLifecycleReportResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/exports/token': {
        get: {
          summary: 'List export tokens',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Token list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      tokens: { type: 'array', items: { $ref: '#/components/schemas/AdminExportTokenListItem' } },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
        post: {
          summary: 'Issue short-lived signed export token',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['resourceKey'],
                  properties: {
                    resourceKey: { type: 'string' },
                    payload: { type: 'object' },
                    ttlSeconds: { type: 'integer', minimum: 30, maximum: 3600 },
                    maxDownloads: { type: 'integer', minimum: 1, maximum: 20 },
                    bindIp: { type: 'boolean' },
                    bindUserAgent: { type: 'boolean' },
                    replayProtection: { type: 'boolean' },
                    allowedIpCidrs: { type: 'array', items: { type: 'string' } },
                    allowedCountries: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Token created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AdminExportTokenResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
        delete: {
          summary: 'Revoke previously issued export token',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    tokenId: { type: 'string' },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Token revoked',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '404': {
              description: 'Token not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/social/risk': {
        get: {
          summary: 'Social abuse risk trend and anomaly dashboard',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Risk dashboard payload',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SocialRiskDashboardResponse' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/social/risk/webhook-log': {
        get: {
          summary: 'Social risk webhook delivery log',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Webhook delivery list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      eventName: { type: 'string' },
                      items: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/social/risk/webhook-metrics': {
        get: {
          summary: 'Social risk webhook retry/failure metrics',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Webhook metrics payload',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      eventName: { type: 'string' },
                      summary: { type: 'object' },
                      retryBuckets: { type: 'array', items: { type: 'object' } },
                      failureClasses: { type: 'array', items: { type: 'object' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/admin/social/risk/webhook-test': {
        post: {
          summary: 'Send social risk webhook test event',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Test event sent',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      eventName: { type: 'string' },
                      payload: { type: 'object' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/monitoring/ack': {
        post: {
          summary: 'Acknowledge monitoring alarm key',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    alarmKey: { type: 'string' },
                    mode: { type: 'string', enum: ['ack', 'snooze', 'maintenance', 'clear'] },
                    snoozeMinutes: { type: 'integer', minimum: 1, maximum: 1440 },
                    maintenanceMinutes: { type: 'integer', minimum: 1, maximum: 1440 },
                    clearMaintenance: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Alarm acknowledged',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      alarmKey: { type: 'string', nullable: true },
                      mode: { type: 'string', enum: ['ack', 'snooze', 'maintenance', 'clear'] },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      '/admin/exports/token/clipboard': {
        post: {
          summary: 'Audit export token clipboard copy action',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Clipboard audit recorded',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } },
              },
            },
          },
        },
      },
      // ─── TOP 20 Detailed Endpoint Specs (Türkçe açıklamalı, kalite ağırlıklı) ───
      '/health': {
        get: {
          summary: 'Sistem sağlık kontrolü',
          description: 'DB + Redis + entegrasyon konfigürasyon özetini döner. PM2/load balancer probe için kullanılır. DB erişilebilirse 200, aksi halde 503 döner.',
          tags: ['System'],
          responses: {
            '200': {
              description: 'Servis sağlıklı',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthStatus' },
                },
              },
            },
            '503': {
              description: 'Servis kullanılamıyor (DB bağlantı hatası)',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthStatus' },
                },
              },
            },
          },
        },
      },
      '/contact': {
        get: {
          summary: 'İletişim taleplerini listele (admin)',
          description: 'Destek talebi (support_tickets) listesi. Sadece admin rolü erişebilir.',
          tags: ['System'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'pending', 'resolved', 'closed'], default: 'open' } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          ],
          responses: {
            '200': {
              description: 'Talep listesi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      tickets: { type: 'array', items: { type: 'object' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Admin yetkisi gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
        post: {
          summary: 'İletişim formu gönderimi',
          description: 'Public iletişim formu — destek talebi oluşturur. Auth gerektirmez.',
          tags: ['System'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ContactRequestInput' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Talep oluşturuldu',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      ticketId: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validasyon hatası (zorunlu alan eksik, çok uzun, geçersiz tür)',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/blog/posts': {
        get: {
          summary: 'Blog yazılarını listele',
          description: 'Yayınlanmış blog yazılarını sayfalı olarak döner. Kategori ve durum filtreleri desteklenir.',
          tags: ['Blog'],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['published', 'draft', 'all'], default: 'published' } },
            { name: 'category', in: 'query', schema: { type: 'string', maxLength: 100 } },
            { name: 'categoryId', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0, minimum: 0 } },
          ],
          responses: {
            '200': {
              description: 'Blog yazısı listesi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          posts: { type: 'array', items: { $ref: '#/components/schemas/BlogPost' } },
                          pagination: {
                            type: 'object',
                            properties: {
                              total: { type: 'integer' },
                              limit: { type: 'integer' },
                              offset: { type: 'integer' },
                              hasMore: { type: 'boolean' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Sunucu hatası',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/blog/comments': {
        get: {
          summary: 'Blog yazısı yorumlarını getir',
          description: 'Belirli bir blog yazısının onaylı yorumlarını döner. `approved=false` ile bekleyenler de listelenebilir.',
          tags: ['Blog'],
          parameters: [
            { name: 'postId', in: 'query', required: true, schema: { type: 'integer', minimum: 1 } },
            { name: 'approved', in: 'query', schema: { type: 'boolean', default: true } },
          ],
          responses: {
            '200': {
              description: 'Yorum listesi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          comments: { type: 'array', items: { $ref: '#/components/schemas/BlogComment' } },
                          count: { type: 'integer' },
                          postId: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validasyon hatası (postId yok / geçersiz)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
        post: {
          summary: 'Blog yazısına yorum ekle',
          description: 'Yorum gönderir; admin onayından sonra yayınlanır. Auth opsiyonel — giriş yapılmışsa kullanıcıya bağlanır.',
          tags: ['Blog'],
          security: [{ bearerAuth: [] }, {}],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BlogCommentInput' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Yorum gönderildi (onay bekliyor)',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/BlogComment' },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '422': {
              description: 'Validasyon hatası',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/events/list': {
        get: {
          summary: 'Etkinlikleri listele',
          description: 'Yayınlanmış etkinlikleri filtre + sayfalama ile döner.',
          tags: ['Events'],
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0, minimum: 0 } },
            { name: 'category', in: 'query', schema: { type: 'string', maxLength: 100 } },
            { name: 'placeId', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Etkinlik listesi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      events: { type: 'array', items: { $ref: '#/components/schemas/Event' } },
                      total: { type: 'integer' },
                      limit: { type: 'integer' },
                      offset: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'Sunucu hatası',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/events/create': {
        post: {
          summary: 'Yeni etkinlik oluştur (admin)',
          description: 'Admin paneli üzerinden çalışan formdata endpoint\'i. Başarılı oluşturmada `/admin/events?success=created` adresine 302 redirect döner.',
          tags: ['Events'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: { $ref: '#/components/schemas/EventInput' },
              },
            },
          },
          responses: {
            '302': {
              description: 'Redirect (başarı veya hata querystring ile)',
              headers: {
                Location: { schema: { type: 'string' } },
              },
            },
            '403': {
              description: 'Admin yetkisi gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/events/{id}/details': {
        get: {
          summary: 'Etkinlik detayını getir',
          description: 'Tek bir etkinliğin tüm alanlarını + lokasyon ve RSVP sayılarını döner.',
          tags: ['Events'],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Etkinlik detayı',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Event' },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Etkinlik bulunamadı',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/reviews': {
        get: {
          summary: 'Yorumları listele',
          description: 'Mekan veya kullanıcı için yorumları listeler. `stats=true` ile rating breakdown alır.',
          tags: ['Reviews'],
          parameters: [
            { name: 'placeId', in: 'query', schema: { type: 'string' } },
            { name: 'userId', in: 'query', schema: { type: 'string' } },
            { name: 'stats', in: 'query', schema: { type: 'string', description: 'true ise rating dağılımı döner' } },
            { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['newest', 'oldest', 'highest', 'lowest', 'helpful'], default: 'newest' } },
            { name: 'rating', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 5 } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 50 } },
          ],
          responses: {
            '200': {
              description: 'Yorum listesi veya rating breakdown',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        oneOf: [
                          {
                            type: 'object',
                            properties: {
                              reviews: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
                              pagination: { $ref: '#/components/schemas/Pagination' },
                            },
                          },
                          {
                            type: 'object',
                            properties: {
                              breakdown: { type: 'object', additionalProperties: { type: 'integer' } },
                              total: { type: 'integer' },
                              average: { type: 'string' },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validasyon hatası',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/reviews/add': {
        post: {
          summary: 'Mekan yorumu ekle',
          description: 'Auth gerekli. Rating (1-5) + content (10-5000c) zorunlu. Başarılı eklemede +5 puan + cache invalidation + gamification tetiklenir.',
          tags: ['Reviews'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReviewInput' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Yorum eklendi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Review' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
            '422': {
              description: 'Validasyon hatası (rating range / content uzunluk / images > 20)',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/favorites': {
        get: {
          summary: 'Favori mekanları listele',
          description: 'Auth gerekli. Kullanıcının favorilediği mekanları döner; her satırda place_name, place_images, place_rating join edilir. 5 dk Redis cache.',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Favori liste',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Favorite' } },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
            '500': {
              description: 'Server error',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
        post: {
          summary: 'Favorilere mekan ekle',
          description: 'Auth gerekli. `placeId` zorunlu. ON CONFLICT atomic insert (HARD RULE #47); zaten favoride ise 400. +5 puan + logActivity + cache invalidate.',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['placeId'],
                  properties: { placeId: { type: 'string', description: 'Mekan UUID' } },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Favorilere eklendi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Favorite' },
                      message: { type: 'string', example: 'Favorilere eklendi' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'placeId yok ya da zaten favoride',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
        delete: {
          summary: 'Favorilerden mekan çıkar',
          description: 'Auth gerekli. `placeId` body içinde. (Path-param varyantı için `/favorites/{id}` kullan.)',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['placeId'],
                  properties: { placeId: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Favorilerden kaldırıldı',
              content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/favorites/{id}': {
        delete: {
          summary: 'Favori kaydını ID ile sil',
          description: 'Auth gerekli. Owner check: yalnızca `user_favorites.user_id = locals.user.id` olan satırı siler (IDOR koruma).',
          tags: ['Favorites'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'user_favorites.id (UUID)' },
          ],
          responses: {
            '200': {
              description: 'Silindi',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true } } } } },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
            '404': {
              description: 'Favori bulunamadı (veya başkasına ait)',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/followers': {
        get: {
          summary: 'Takipçi / takip edilen / ortak arkadaş listesi',
          description: '`type` query: followers (default), following, mutual. `limit` 1-100 (safeIntParam HARD RULE #17).',
          tags: ['Followers'],
          parameters: [
            { name: 'userId', in: 'query', required: true, schema: { type: 'string' }, description: 'Listenin sahibi kullanıcı' },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['followers', 'following', 'mutual'], default: 'followers' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 } },
          ],
          responses: {
            '200': {
              description: 'Takipçi listesi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Follower' } },
                      count: { type: 'integer' },
                      type: { type: 'string' },
                    },
                  },
                },
              },
            },
            '422': {
              description: 'userId eksik veya geçersiz type',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
        post: {
          summary: 'Kullanıcıyı takip et',
          description: 'Auth gerekli. Body: `userId` (takip edilecek). Kendini takip etmek `/followers/{id}` üzerinden engellenir.',
          tags: ['Followers'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['userId'], properties: { userId: { type: 'string' } } },
              },
            },
          },
          responses: {
            '201': {
              description: 'Takip edildi',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } },
                },
              },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '422': {
              description: 'userId eksik',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
        delete: {
          summary: 'Takipten çık (body ile)',
          description: 'Auth gerekli. Body: `userId`. Path-param varyantı: `/followers/{id}`.',
          tags: ['Followers'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object', required: ['userId'], properties: { userId: { type: 'string' } } },
              },
            },
          },
          responses: {
            '200': {
              description: 'Takip durduruldu',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } } },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/followers/{id}': {
        post: {
          summary: 'Kullanıcıyı takip et (path-param)',
          description: 'Auth gerekli. Path: hedef kullanıcı ID. Kendini takip 400 döner.',
          tags: ['Followers'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Hedef kullanıcı UUID' },
          ],
          responses: {
            '201': {
              description: 'Takip edildi',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, following: { type: 'boolean', example: true } } } } },
            },
            '400': {
              description: 'Kendini takip edemezsiniz / ID eksik',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
        delete: {
          summary: 'Takibi bırak (path-param)',
          description: 'Auth gerekli. Path: takipten çıkılacak kullanıcı ID.',
          tags: ['Followers'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Takip kaldırıldı',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, following: { type: 'boolean', example: false } } } } },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/followers/stats': {
        get: {
          summary: 'Bir kullanıcının takipçi istatistikleri',
          description: 'Followers count / following count / mutual count / current viewer takip edip etmediği. 2 dk Redis cache.',
          tags: ['Followers'],
          parameters: [
            { name: 'userId', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'İstatistikler',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          followers: { type: 'integer' },
                          following: { type: 'integer' },
                          mutual: { type: 'integer' },
                          isFollowing: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '422': {
              description: 'userId eksik',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/notifications': {
        get: {
          summary: 'Bildirimleri listele',
          description: 'Auth gerekli. `unreadOnly=true` ile filtrele. `limit` safeIntParam (default 20). unreadCount paralel hesaplanır.',
          tags: ['Notifications'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'unreadOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 0 } },
          ],
          responses: {
            '200': {
              description: 'Bildirim listesi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                      unreadCount: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
            '500': {
              description: 'Server error',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
        post: {
          summary: 'Bildirimi okundu işaretle',
          description: 'Auth gerekli. `markAll: true` ile tümü, ya da `notificationId` ile tek bir bildirim. En az biri zorunlu.',
          tags: ['Notifications'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notificationId: { type: 'string' },
                    markAll: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Güncellendi',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, unreadCount: { type: 'integer' } } } } },
            },
            '400': {
              description: 'notificationId veya markAll eksik',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/notifications/read-all': {
        put: {
          summary: 'Tüm bildirimleri okundu işaretle (queue version)',
          description: 'Auth gerekli. notifications-queue lib üzerinden idempotent. Etkilenen satır sayısını `markedCount` olarak döner. Cache invalidation tetiklenir.',
          tags: ['Notifications'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Tümü okundu işaretlendi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      markedCount: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/notifications/mark-all-read': {
        post: {
          summary: 'Tüm bildirimleri okundu işaretle (direct query)',
          description: 'Auth gerekli. Raw UPDATE: `read=true, read_at=now()` for unread rows. ISO read_at zamanı.',
          tags: ['Notifications'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Okundu işaretlendi',
              content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean', example: true } } } } },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
            '500': {
              description: 'Server error',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/profile/update': {
        post: {
          summary: 'Profil bilgilerini güncelle (form action)',
          description: 'Auth gerekli. `multipart/form-data` ile `full_name`, `username`, `bio`. Başarılıysa `/profil/ayarlar?success=profile_updated` URL\'sine **303 redirect**; bu nedenle JSON response yoktur. Cache: user invalidate.',
          tags: ['Profile'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    full_name: { type: 'string' },
                    username: { type: 'string' },
                    bio: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '303': {
              description: 'Profil güncellendi — `/profil/ayarlar` sayfasına yönlendirme',
              headers: { Location: { schema: { type: 'string' } } },
            },
            '302': {
              description: 'Auth yok — login sayfasına yönlendirme',
              headers: { Location: { schema: { type: 'string', example: '/giris?redirect=/profil/ayarlar' } } },
            },
          },
        },
      },
      '/profile/delete': {
        post: {
          summary: 'Hesabımı sil',
          description: 'Auth gerekli. `users` tablosundan satırı siler, oturumu sonlandırır (`signOut(token)`), `auth-token` cookie\'sini temizler, ana sayfaya yönlendirir.',
          tags: ['Profile'],
          security: [{ bearerAuth: [] }],
          responses: {
            '303': {
              description: 'Hesap silindi — `/?account_deleted=true` yönlendirme',
              headers: { Location: { schema: { type: 'string' } } },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/historical-sites/create': {
        post: {
          summary: 'Tarihi yer ekle (admin)',
          description: 'Admin yetkisi gerekli (`locals.isAdmin`). `multipart/form-data`. Başarılıysa `/admin/historical-sites?success=created` redirect. Cache: historical-site invalidate.',
          tags: ['HistoricalSites'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['name', 'description', 'location'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    short_description: { type: 'string' },
                    location: { type: 'string' },
                    period: { type: 'string' },
                    entry_fee: { type: 'string' },
                    opening_hours: { type: 'string' },
                    latitude: { type: 'string' },
                    longitude: { type: 'string' },
                    images: { type: 'string', description: 'JSON array veya CSV string' },
                    is_unesco: { type: 'string', enum: ['true', 'false', 'on'] },
                    is_featured: { type: 'string', enum: ['true', 'false', 'on'] },
                    status: { type: 'string', enum: ['draft', 'published', 'archived'], default: 'draft' },
                  },
                },
              },
            },
          },
          responses: {
            '303': {
              description: 'Tarihi yer oluşturuldu — admin listesine yönlendirme',
              headers: { Location: { schema: { type: 'string' } } },
            },
            '403': {
              description: 'Admin yetkisi yok',
              content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
          },
        },
      },
      '/comments': {
        get: {
          summary: 'Yorumları listele (multi-target)',
          description: '`targetType` zorunlu allowlist: place|review|blog|event|recipe. `targetId` zorunlu. `limit` safeIntParam (1-100, default 50).',
          tags: ['Comments'],
          parameters: [
            { name: 'targetType', in: 'query', required: true, schema: { type: 'string', enum: ['place', 'review', 'blog', 'event', 'recipe'] } },
            { name: 'targetId', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 } },
          ],
          responses: {
            '200': {
              description: 'Yorum listesi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
                      count: { type: 'integer' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Geçersiz targetType',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '422': {
              description: 'targetType veya targetId eksik',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
        post: {
          summary: 'Yorum ekle (multi-target)',
          description: 'Auth gerekli. `targetType` allowlist (place/review/blog/event/recipe). `content` 1-5000 char (sanitize: true XSS koruma). `parentCommentId` opsiyonel (reply). Cache invalidate.',
          tags: ['Comments'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CommentInput' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Yorum eklendi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Comment' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '422': {
              description: 'Validasyon hatası (boş içerik / 5000c aşımı / geçersiz targetType)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
      '/photos/upload': {
        post: {
          summary: 'Mekan fotoğrafı yükle',
          description: 'Auth + (admin VEYA mekan sahibi). `multipart/form-data` ile `file` + `placeId`. Sıkı validasyon: MAX 10MB, MIME allowlist (jpeg/png/webp), uzantı + **magic bytes** (HARD RULE #2). Mekan başına max 50 fotoğraf. Cloud storage YASAK — local disk.',
          tags: ['Photos'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file', 'placeId'],
                  properties: {
                    file: { type: 'string', format: 'binary', description: 'Görsel dosya (jpeg/png/webp, max 10MB)' },
                    placeId: { type: 'string', description: 'Mekan UUID' },
                    altText: { type: 'string' },
                    caption: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Fotoğraf yüklendi',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/Photo' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Giriş gerekli',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '403': {
              description: 'Yetki yok — admin veya mekan sahibi olmalı (IDOR koruma)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '404': {
              description: 'Mekan bulunamadı',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '422': {
              description: 'Validasyon (dosya boyutu / MIME / magic bytes / 50 fotoğraf limiti)',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
            '500': {
              description: 'Disk yazma hatası',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorApi' } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin', 'vendor'] },
            avatar: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Place: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            rating: { type: 'number' },
            reviewCount: { type: 'integer' },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lon: { type: 'number' },
              },
            },
            address: { type: 'string' },
            phone: { type: 'string' },
            imageUrl: { type: 'string', description: 'Normalized main image URL' },
            thumbnailUrl: { type: 'string', description: 'Normalized thumbnail image URL' },
            images: { type: 'array', items: { type: 'string' } },
            openHours: { type: 'string' },
            priceRange: { type: 'integer', minimum: 1, maximum: 4 },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        PlaceInput: {
          type: 'object',
          required: ['name', 'category', 'location'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number' },
                lon: { type: 'number' },
              },
            },
            address: { type: 'string' },
            phone: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        UploadPhoto: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            url: { type: 'string', description: 'Normalized main image URL' },
            image_url: { type: 'string', description: 'Normalized main image URL (snake_case)' },
            thumbnailUrl: { type: 'string', description: 'Normalized thumbnail image URL' },
            thumbnail_url: { type: 'string', description: 'Normalized thumbnail image URL (snake_case)' },
            caption: { type: 'string' },
            type: { type: 'string' },
            photo_type: { type: 'string' },
            is_primary: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            file_size: { type: 'integer' },
          },
        },
        PlacePhotosResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'array', items: { $ref: '#/components/schemas/UploadPhoto' } },
                count: { type: 'integer' },
              },
            },
          },
        },
        PlaceLikeGetResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                    hasLiked: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
        PlaceLikeMutationResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        PlaceShareGetResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        PlaceSharePostResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    shareId: { type: 'string' },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        PlaceFollowResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string' },
              },
            },
          },
        },
        PlaceVerificationResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                verification: { type: 'object' },
              },
            },
          },
        },
        PlaceBadgesResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                badges: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        PlaceAnalyticsResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'object' },
                period: { type: 'integer' },
              },
            },
          },
        },
        PlacePromotionsResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                promotions: { type: 'array', items: { type: 'object' } },
                count: { type: 'integer' },
              },
            },
          },
        },
        PlaceAvailabilityResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                slots: { type: 'array', items: { type: 'string' } },
                date: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
        },
        PlaceReviewAnalyticsResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    summary: { type: 'object' },
                    top_reviews: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
        PlaceRatingDistributionResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    five_stars: { type: 'integer' },
                    four_stars: { type: 'integer' },
                    three_stars: { type: 'integer' },
                    two_stars: { type: 'integer' },
                    one_stars: { type: 'integer' },
                    total_reviews: { type: 'integer' },
                    average_rating: { type: 'number' },
                  },
                },
              },
            },
          },
        },
        PlaceRequestVerificationResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                verification: { type: 'object' },
              },
            },
          },
        },
        FeaturedListing: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            place_id: { type: 'string' },
            user_id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            featured_image_url: { type: 'string', description: 'Normalized image URL' },
            position_tier: { type: 'string' },
            start_date: { type: 'string', format: 'date-time' },
            end_date: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
            views_count: { type: 'integer' },
            clicks_count: { type: 'integer' },
            conversions_count: { type: 'integer' },
            cost_per_day: { type: 'number' },
            total_cost: { type: 'number' },
            payment_status: { type: 'string' },
            place_name: { type: 'string' },
            place_slug: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        FavoritePlace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            rating: { type: 'number' },
            price_range: { type: 'integer' },
            address: { type: 'string' },
            image_url: { type: 'string', description: 'Normalized main image URL' },
            thumbnail_url: { type: 'string', description: 'Normalized thumbnail image URL' },
            favorited_at: { type: 'string', format: 'date-time' },
            favorite_id: { type: 'string' },
          },
        },
        FollowedPlace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            rating: { type: 'number' },
            image: { type: 'string', description: 'Normalized main image URL' },
            thumbnail: { type: 'string', description: 'Normalized thumbnail image URL' },
            followedAt: { type: 'string', format: 'date-time' },
            followers: { type: 'integer' },
          },
        },
        VisitRecord: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            placeId: { type: 'string' },
            visitedAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
            rating: { type: 'number' },
            durationMinutes: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        MostVisitedPlace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            category: { type: 'string' },
            rating: { type: 'number' },
            visitCount: { type: 'integer' },
          },
        },
        VisitStats: {
          type: 'object',
          nullable: true,
          properties: {
            totalVisits: { type: 'integer' },
            uniquePlaces: { type: 'integer' },
            averageRating: { type: 'string', nullable: true },
            lastVisit: { type: 'string', format: 'date-time', nullable: true },
            totalMinutes: { type: 'integer' },
          },
        },
        RecommendationPlace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            category: { type: 'string' },
            rating: { type: 'number' },
            image_url: { type: 'string', description: 'Normalized main image URL' },
            district: { type: 'string' },
            reason: { type: 'string' },
            score: { type: 'number' },
          },
        },
        SearchAdvancedResult: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            average_rating: { type: 'number' },
            review_count: { type: 'integer' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            image_url: { type: 'string', description: 'Normalized main image URL' },
            updated_at: { type: 'string', format: 'date-time' },
            favorite_count: { type: 'integer' },
          },
        },
        SearchAdvancedMeta: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            totalResults: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' },
          },
        },
        SearchAdvancedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/SearchAdvancedResult' },
            },
            meta: { $ref: '#/components/schemas/SearchAdvancedMeta' },
          },
        },
        AuthRegisterResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        UserFavoritesResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            favorites: { type: 'array', items: { $ref: '#/components/schemas/FavoritePlace' } },
          },
        },
        AdminDashboardTopPlace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            image_url: { type: 'string', description: 'Normalized main image URL' },
            thumbnail_url: { type: 'string', description: 'Normalized thumbnail image URL' },
            total_views: { type: 'number' },
          },
        },
        AdminDashboardDailyStat: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
            views: { type: 'number' },
            phone_clicks: { type: 'number' },
            direction_clicks: { type: 'number' },
          },
        },
        AdminDashboardStats: {
          type: 'object',
          properties: {
            users: { type: 'object' },
            places: { type: 'object' },
            reviews: { type: 'object' },
            tickets: { type: 'object' },
          },
        },
        AdminDashboardRecent: {
          type: 'object',
          properties: {
            users: { type: 'array', items: { type: 'object' } },
            places: { type: 'array', items: { type: 'object' } },
          },
        },
        AdminDashboardResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            stats: { $ref: '#/components/schemas/AdminDashboardStats' },
            recent: { $ref: '#/components/schemas/AdminDashboardRecent' },
            topPlaces: {
              type: 'array',
              items: { $ref: '#/components/schemas/AdminDashboardTopPlace' },
            },
            dailyStats: {
              type: 'array',
              items: { $ref: '#/components/schemas/AdminDashboardDailyStat' },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        ProblemDetails: {
          type: 'object',
          description: 'RFC 7807 problem+json error envelope (apiError/problemJson helper output)',
          required: ['status', 'title'],
          properties: {
            type: { type: 'string', description: 'URI referans (problems/...)', example: '/problems/validation-error' },
            title: { type: 'string' },
            status: { type: 'integer' },
            detail: { type: 'string' },
            instance: { type: 'string' },
          },
        },
        HealthStatus: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'string', enum: ['healthy', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'number' },
            database: { type: 'string', enum: ['connected', 'disconnected'] },
            redis: { type: 'string', enum: ['connected', 'disconnected', 'optional'] },
            integrations: {
              type: 'object',
              additionalProperties: { type: 'string', enum: ['configured', 'unconfigured'] },
            },
            version: { type: 'string' },
          },
        },
        ContactRequestInput: {
          type: 'object',
          required: ['name', 'email', 'subject', 'message'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 200 },
            email: { type: 'string', format: 'email', maxLength: 254 },
            phone: { type: 'string', maxLength: 30, nullable: true },
            subject: { type: 'string', minLength: 1, maxLength: 200 },
            message: { type: 'string', minLength: 1, maxLength: 5000 },
            type: {
              type: 'string',
              enum: ['general', 'business_inquiry', 'technical_support', 'complaint', 'suggestion', 'partnership'],
              default: 'general',
            },
            placeId: { type: 'string', nullable: true },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            place_id: { type: 'string' },
            user_id: { type: 'string' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            title: { type: 'string', nullable: true },
            content: { type: 'string' },
            images: { type: 'array', items: { type: 'string' }, nullable: true },
            status: { type: 'string', enum: ['active', 'pending', 'rejected', 'deleted'] },
            helpful_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            author: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                avatar_url: { type: 'string', nullable: true },
              },
            },
          },
          required: ['id', 'place_id', 'user_id', 'rating', 'content', 'status'],
        },
        ReviewInput: {
          type: 'object',
          required: ['placeId', 'rating', 'content'],
          properties: {
            placeId: { type: 'string', description: 'Yorumlanacak mekan ID (snake_case `place_id` de kabul edilir)' },
            rating: { type: 'number', minimum: 1, maximum: 5 },
            title: { type: 'string', maxLength: 200, nullable: true },
            content: { type: 'string', minLength: 10, maxLength: 5000 },
            images: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 20,
              description: 'En fazla 20 görsel URL',
            },
            visitType: { type: 'string', nullable: true },
          },
        },
        BlogPost: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            slug: { type: 'string' },
            title: { type: 'string' },
            excerpt: { type: 'string', nullable: true },
            content: { type: 'string' },
            category: { type: 'string', nullable: true },
            category_id: { type: 'integer', nullable: true },
            featured_image: { type: 'string', nullable: true },
            thumbnail: { type: 'string', nullable: true },
            tags: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['published', 'draft', 'archived'] },
            seo_title: { type: 'string', nullable: true },
            seo_description: { type: 'string', nullable: true },
            seo_keywords: { type: 'string', nullable: true },
            author_id: { type: 'string', nullable: true },
            read_time: { type: 'integer', nullable: true },
            view_count: { type: 'integer' },
            published_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'slug', 'title', 'status'],
        },
        BlogComment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            post_id: { type: 'string' },
            user_id: { type: 'string', nullable: true },
            author_name: { type: 'string' },
            author_email: { type: 'string', format: 'email', nullable: true },
            content: { type: 'string' },
            approved: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'post_id', 'author_name', 'content', 'approved'],
        },
        BlogCommentInput: {
          type: 'object',
          required: ['postId', 'authorName', 'content'],
          properties: {
            postId: { type: 'integer', minimum: 1 },
            authorName: { type: 'string', minLength: 2, maxLength: 100 },
            authorEmail: { type: 'string', format: 'email', nullable: true },
            content: { type: 'string', minLength: 2, maxLength: 5000 },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string', nullable: true },
            title: { type: 'string' },
            description: { type: 'string' },
            short_description: { type: 'string', nullable: true },
            location: { type: 'string' },
            start_date: { type: 'string', format: 'date-time' },
            end_date: { type: 'string', format: 'date-time', nullable: true },
            category: { type: 'string', nullable: true },
            image_url: { type: 'string', nullable: true },
            is_featured: { type: 'boolean' },
            status: { type: 'string', enum: ['draft', 'published', 'cancelled'] },
            place_id: { type: 'string', nullable: true },
            rsvp_count: { type: 'integer', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'title', 'description', 'location', 'start_date', 'status'],
        },
        EventInput: {
          type: 'object',
          required: ['title', 'description', 'location', 'start_date', 'category'],
          properties: {
            title: { type: 'string', maxLength: 200 },
            description: { type: 'string', maxLength: 5000 },
            location: { type: 'string', maxLength: 500 },
            start_date: { type: 'string', format: 'date-time' },
            end_date: { type: 'string', format: 'date-time', nullable: true },
            category: { type: 'string' },
            image: { type: 'string', nullable: true },
            is_featured: { type: 'string', description: 'Form checkbox değeri ("on" veya boş)' },
            status: { type: 'string', enum: ['draft', 'published', 'cancelled'], default: 'draft' },
          },
        },
        SocialEventItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            event_type: { type: 'string' },
            actor_user_id: { type: 'string', nullable: true },
            target_user_id: { type: 'string', nullable: true },
            conversation_id: { type: 'string', nullable: true },
            metadata: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        SocialEventsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/SocialEventItem' },
            },
            total: { type: 'integer' },
            nextCursor: { type: 'string', nullable: true },
            filters: { type: 'object' },
          },
        },
        PlaceLifecycleEventItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            place_id: { type: 'string' },
            place_name: { type: 'string', nullable: true },
            from_status: { type: 'string', nullable: true },
            to_status: { type: 'string' },
            actor_user_id: { type: 'string', nullable: true },
            actor_email: { type: 'string', nullable: true },
            reason: { type: 'string', nullable: true },
            metadata: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        PlaceLifecycleTimelineResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/PlaceLifecycleEventItem' },
            },
            total: { type: 'integer' },
            filters: { type: 'object' },
          },
        },
        PlaceLifecycleSlaSummary: {
          type: 'object',
          properties: {
            pending_count: { type: 'integer' },
            needs_info_count: { type: 'integer' },
            pending_breached_count: { type: 'integer' },
          },
        },
        PlaceLifecycleSlaResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            slaHours: { type: 'integer' },
            summary: { $ref: '#/components/schemas/PlaceLifecycleSlaSummary' },
            breached: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
        SocialLifecycleReportResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            windowHours: { type: 'integer' },
            generatedAt: { type: 'string', format: 'date-time' },
            social: {
              type: 'object',
              properties: {
                eventsByType: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
            lifecycle: {
              type: 'object',
              properties: {
                transitionsByStatus: {
                  type: 'array',
                  items: { type: 'object' },
                },
                currentSlaSnapshot: {
                  type: 'object',
                },
              },
            },
          },
        },
        AdminExportTokenResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            resourceKey: { type: 'string' },
            token: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
            ttlSeconds: { type: 'integer' },
            maxDownloads: { type: 'integer' },
          },
        },
        AdminExportTokenListItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            resource_key: { type: 'string' },
            expires_at: { type: 'string', format: 'date-time' },
            max_downloads: { type: 'integer' },
            used_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            last_used_at: { type: 'string', format: 'date-time', nullable: true },
            revoked_at: { type: 'string', format: 'date-time', nullable: true },
            revoke_reason: { type: 'string', nullable: true },
            payload: { type: 'object', nullable: true },
          },
        },
        SocialRiskTenant: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            score: { type: 'integer' },
            anomaly: { type: 'boolean' },
            shouldAlert: { type: 'boolean' },
            scoreAlarm: { type: 'boolean' },
            zScoreAlarm: { type: 'boolean' },
            lastHour: { type: 'integer' },
            avg: { type: 'number' },
            stdev: { type: 'number' },
            zScore: { type: 'number' },
            total: { type: 'integer' },
            trend: { type: 'array', items: { type: 'object' } },
            reasons: { type: 'array', items: { type: 'object' } },
          },
        },
        SocialRiskDashboardResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            windowHours: { type: 'integer' },
            generatedAt: { type: 'string', format: 'date-time' },
            thresholds: { type: 'object' },
            webhook: { type: 'object' },
            autoActions: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean' },
                cooldownMinutes: { type: 'integer' },
                appliedTenantIds: { type: 'array', items: { type: 'string' } },
                rollbackCount: { type: 'integer' },
              },
            },
            alertedTenantIds: { type: 'array', items: { type: 'string' } },
            tenants: {
              type: 'array',
              items: { $ref: '#/components/schemas/SocialRiskTenant' },
            },
          },
        },
        ErrorBasic: {
          type: 'object',
          required: ['error'],
          properties: {
            error: { type: 'string' },
          },
        },
        ErrorFlagged: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { type: 'boolean', enum: [false] },
            error: { type: 'string' },
          },
        },
        ErrorApi: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' },
              },
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: { type: 'string', format: 'date-time' },
                requestId: { type: 'string' },
              },
            },
          },
        },
        Error: {
          oneOf: [
            { $ref: '#/components/schemas/ErrorBasic' },
            { $ref: '#/components/schemas/ErrorFlagged' },
            { $ref: '#/components/schemas/ErrorApi' },
          ],
        },
        Favorite: {
          type: 'object',
          description: 'Bir kullanıcının favori mekan kaydı (favorites tablosu + places join).',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            place_id: { type: 'string', format: 'uuid' },
            created_at: { type: 'string', format: 'date-time' },
            place_name: { type: 'string' },
            place_images: { type: 'array', items: { type: 'string' }, description: 'public path listesi' },
            place_rating: { type: 'number', format: 'float' },
          },
        },
        Follower: {
          type: 'object',
          description: 'Takipçi / takip edilen kullanıcı kaydı.',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            username: { type: 'string' },
            avatar: { type: 'string', nullable: true },
            followed_at: { type: 'string', format: 'date-time' },
            is_following_back: { type: 'boolean', description: 'mutual ve following tiplerinde anlamlı' },
          },
        },
        Notification: {
          type: 'object',
          description: 'Kullanıcı bildirimi (notifications tablosu).',
          required: ['id', 'user_id', 'type', 'read'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', description: 'follow / comment / review / system / promotion vb.' },
            title: { type: 'string' },
            body: { type: 'string' },
            data: { type: 'object', description: 'type-specific payload (linkler, entity ID)' },
            read: { type: 'boolean' },
            read_at: { type: 'string', format: 'date-time', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Comment: {
          type: 'object',
          description: 'Multi-target yorum (place / review / blog / event / recipe).',
          required: ['id', 'user_id', 'targetType', 'targetId', 'content'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            user_name: { type: 'string' },
            user_avatar: { type: 'string', nullable: true },
            targetType: { type: 'string', enum: ['place', 'review', 'blog', 'event', 'recipe'] },
            targetId: { type: 'string' },
            content: { type: 'string', minLength: 1, maxLength: 5000 },
            parentCommentId: { type: 'string', format: 'uuid', nullable: true },
            likeCount: { type: 'integer' },
            replyCount: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        CommentInput: {
          type: 'object',
          required: ['targetType', 'targetId', 'content'],
          properties: {
            targetType: { type: 'string', enum: ['place', 'review', 'blog', 'event', 'recipe'] },
            targetId: { type: 'string', maxLength: 100 },
            content: { type: 'string', minLength: 1, maxLength: 5000, description: 'XSS sanitize edilir' },
            parentCommentId: { type: 'string', maxLength: 100, description: 'Reply için parent comment ID' },
          },
        },
        Photo: {
          type: 'object',
          description: 'place_photos kaydı (lokal disk).',
          required: ['id', 'place_id', 'file_path'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            place_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            file_path: { type: 'string', description: 'public/uploads altındaki relative path' },
            file_size: { type: 'integer' },
            mime_type: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] },
            alt_text: { type: 'string', nullable: true },
            caption: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };

  return new Response(JSON.stringify(openApiSpec), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
  });
};
