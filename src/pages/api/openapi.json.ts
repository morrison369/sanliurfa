import type { APIRoute } from 'astro';

const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Şanlıurfa.com API',
    version: '1.0.0',
    description: 'Complete API documentation for Şanlıurfa.com platform',
    contact: { name: 'Support', email: 'support@sanliurfa.com' }
  },
  servers: [
    { url: 'https://sanliurfa.com/api', description: 'Production' },
    { url: 'https://staging.sanliurfa.com/api', description: 'Staging' },
    { url: 'http://localhost:3000/api', description: 'Development' }
  ],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register new user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  fullName: { type: 'string' }
                },
                required: ['email', 'password', 'fullName']
              }
            }
          }
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Invalid input' },
          409: { description: 'Email already registered' }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Login user',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          200: { description: 'Login successful' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/places': {
      get: {
        summary: 'Get all places',
        tags: ['Places'],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          200: { description: 'Places list' }
        }
      }
    },
    '/places/{id}': {
      get: {
        summary: 'Get place by ID',
        tags: ['Places'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'Place details' },
          404: { description: 'Place not found' }
        }
      }
    },
    '/reviews': {
      post: {
        summary: 'Create review',
        tags: ['Reviews'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  placeId: { type: 'string' },
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  comment: { type: 'string' }
                },
                required: ['placeId', 'rating', 'comment']
              }
            }
          }
        },
        responses: {
          201: { description: 'Review created' },
          400: { description: 'Invalid input' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/billing/checkout': {
      post: {
        summary: 'Create subscription checkout',
        tags: ['Billing'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  tier: { type: 'string', enum: ['premium', 'pro'] },
                  priceId: { type: 'string' }
                },
                required: ['tier', 'priceId']
              }
            }
          }
        },
        responses: {
          200: { description: 'Checkout session created' },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/admin/reports/generate': {
      post: {
        summary: 'Generate admin report',
        tags: ['Admin'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['users', 'places', 'reviews', 'revenue', 'engagement'] },
                  period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] }
                },
                required: ['type', 'period']
              }
            }
          }
        },
        responses: {
          200: { description: 'Report generated' },
          403: { description: 'Forbidden' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

export const GET: APIRoute = async ({ request }) => {
  return new Response(JSON.stringify(openapi, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
