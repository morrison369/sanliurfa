// @ts-nocheck
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'Şanlıurfa.com API',
      description: 'REST API for Şanlıurfa.com - Travel Guide Platform',
      version: '1.0.0',
      contact: {
        name: 'API Support',
        email: 'api@sanliurfa.com',
      },
    },
    servers: [
      {
        url: 'https://sanliurfa.com/api',
        description: 'Production server',
      },
      {
        url: 'http://localhost:4321/api',
        description: 'Development server',
      },
    ],
    paths: {
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
            '401': { description: 'Invalid credentials' },
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
            '401': { description: 'Unauthorized' },
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
                  schema: { $ref: '#/components/schemas/Place' },
                },
              },
            },
            '404': { description: 'Place not found' },
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
                    folder: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'File uploaded',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      url: { type: 'string' },
                      thumbnailUrl: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/payments/intent': {
        post: {
          summary: 'Create payment intent',
          tags: ['Payments'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'currency'],
                  properties: {
                    amount: { type: 'number', description: 'Amount in smallest currency unit' },
                    currency: { type: 'string', default: 'TRY' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Payment intent created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      clientSecret: { type: 'string' },
                      paymentId: { type: 'string' },
                    },
                  },
                },
              },
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
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            message: { type: 'string' },
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

  return new Response(JSON.stringify(openApiSpec, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
