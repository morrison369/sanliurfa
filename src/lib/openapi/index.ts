/**
 * OpenAPI Documentation Generator
 * Auto-generates API documentation from route handlers
 */
import { getPublicAppUrl } from '../public-app-url';

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
}

export interface OpenAPIPath {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: OpenAPISecurityRequirement[];
}

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema: OpenAPISchema;
}

export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: OpenAPISchema }>;
}

export interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema: OpenAPISchema }>;
  headers?: Record<string, OpenAPIHeader>;
}

export interface OpenAPIHeader {
  description?: string;
  schema: OpenAPISchema;
}

export type OpenAPISchema =
  | { type: 'string'; format?: string; enum?: string[]; minLength?: number; maxLength?: number; pattern?: string; nullable?: boolean }
  | { type: 'number' | 'integer'; minimum?: number; maximum?: number; exclusiveMinimum?: boolean; exclusiveMaximum?: boolean; nullable?: boolean }
  | { type: 'boolean'; nullable?: boolean }
  | { type: 'array'; items: OpenAPISchema; minItems?: number; maxItems?: number; nullable?: boolean }
  | { type: 'object'; properties?: Record<string, OpenAPISchema>; required?: string[]; additionalProperties?: boolean | OpenAPISchema; nullable?: boolean }
  | { oneOf: OpenAPISchema[] }
  | { anyOf: OpenAPISchema[] }
  | { allOf: OpenAPISchema[] }
  | { $ref: string };

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    implicit?: OAuthFlow;
    password?: OAuthFlow;
    clientCredentials?: OAuthFlow;
    authorizationCode?: OAuthFlow;
  };
  openIdConnectUrl?: string;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface OpenAPISecurityRequirement {
  [name: string]: string[];
}

export interface OpenAPIDocument {
  openapi: '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3' | '3.1.0';
  info: OpenAPIInfo;
  servers?: { url: string; description?: string }[];
  paths: Record<string, Record<string, OpenAPIPath>>;
  components?: {
    schemas?: Record<string, OpenAPISchema>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    parameters?: Record<string, OpenAPIParameter>;
    responses?: Record<string, OpenAPIResponse>;
    headers?: Record<string, OpenAPIHeader>;
  };
  tags?: { name: string; description?: string }[];
  security?: OpenAPISecurityRequirement[];
}

/**
 * Create OpenAPI document
 */
export function createOpenAPIDocument(
  info: OpenAPIInfo,
  servers: { url: string; description?: string }[] = []
): OpenAPIDocument {
  return {
    openapi: '3.0.3',
    info,
    servers: servers.length > 0 ? servers : [{ url: '/api', description: 'API Server' }],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token authentication',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key authentication',
        },
      },
    },
  };
}

/**
 * Add path to OpenAPI document
 */
export function addPath(
  doc: OpenAPIDocument,
  path: string,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options',
  operation: OpenAPIPath
): void {
  if (!doc.paths[path]) {
    doc.paths[path] = {};
  }
  doc.paths[path][method] = operation;
}

/**
 * Add schema to components
 */
export function addSchema(
  doc: OpenAPIDocument,
  name: string,
  schema: OpenAPISchema
): void {
  if (!doc.components) {
    doc.components = {};
  }
  if (!doc.components.schemas) {
    doc.components.schemas = {};
  }
  doc.components.schemas[name] = schema;
}

// Common schemas
export const schemas = {
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      fullName: { type: 'string' },
      avatarUrl: { type: 'string', format: 'uri', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'email', 'fullName', 'createdAt'],
  } as OpenAPISchema,

  Place: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      address: { type: 'string' },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
      rating: { type: 'number', minimum: 0, maximum: 5 },
      reviewCount: { type: 'integer' },
      images: { type: 'array', items: { type: 'string' } },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'name', 'description', 'category', 'latitude', 'longitude'],
  } as OpenAPISchema,

  Review: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      placeId: { type: 'string' },
      userId: { type: 'string' },
      rating: { type: 'integer', minimum: 1, maximum: 5 },
      comment: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
    required: ['id', 'placeId', 'userId', 'rating', 'createdAt'],
  } as OpenAPISchema,

  Error: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      error: { type: 'string' },
      code: { type: 'string' },
      details: { type: 'object', additionalProperties: true },
      requestId: { type: 'string' },
    },
    required: ['success', 'error', 'code'],
  } as OpenAPISchema,

  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100 },
      total: { type: 'integer' },
      totalPages: { type: 'integer' },
    },
    required: ['page', 'limit', 'total', 'totalPages'],
  } as OpenAPISchema,
};

/**
 * Generate OpenAPI document for Şanlıurfa API
 */
export function generateSanliurfaAPIDoc(baseUrl: string = `${getPublicAppUrl()}/api`): OpenAPIDocument {
  const publicAppUrl = getPublicAppUrl();
  const doc = createOpenAPIDocument(
    {
      title: 'Şanlıurfa API',
      version: '1.0.0',
      description: 'Şanlıurfa Travel Guide Platform REST API',
      contact: {
        name: 'Şanlıurfa Support',
        email: 'api@sanliurfa.com',
        url: `${publicAppUrl}/docs`,
      },
    },
    [
      { url: baseUrl, description: 'Production' },
      { url: 'http://localhost:4321/api', description: 'Local Development' },
    ]
  );

  // Add schemas
  Object.entries(schemas).forEach(([name, schema]) => {
    addSchema(doc, name, schema);
  });

  // Add tags
  doc.tags = [
    { name: 'Places', description: 'Mekan işlemleri' },
    { name: 'Reviews', description: 'Değerlendirme işlemleri' },
    { name: 'Users', description: 'Kullanıcı işlemleri' },
    { name: 'Search', description: 'Arama işlemleri' },
    { name: 'Auth', description: 'Kimlik doğrulama' },
  ];

  // Places endpoints
  addPath(doc, '/places', 'get', {
    summary: 'Mekanları listele',
    tags: ['Places'],
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Sayfa numarası' },
      { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 }, description: 'Sayfa başına öğe' },
      { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Kategori filtresi' },
      { name: 'lat', in: 'query', schema: { type: 'number' }, description: 'Enlem (yakınlık arama)' },
      { name: 'lng', in: 'query', schema: { type: 'number' }, description: 'Boylam (yakınlık arama)' },
      { name: 'radius', in: 'query', schema: { type: 'number' }, description: 'Yarıçap metre (yakınlık arama)' },
    ],
    responses: {
      '200': {
        description: 'Başarılı',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: { type: 'array', items: { $ref: '#/components/schemas/Place' } },
                pagination: { $ref: '#/components/schemas/Pagination' },
              },
            },
          },
        },
      },
      '400': { description: 'Geçersiz parametre', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  });

  addPath(doc, '/places/{id}', 'get', {
    summary: 'Mekan detayı',
    tags: ['Places'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Mekan ID' },
    ],
    responses: {
      '200': {
        description: 'Başarılı',
        content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Place' } } } } },
      },
      '404': { description: 'Mekan bulunamadı', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  });

  addPath(doc, '/places', 'post', {
    summary: 'Yeni mekan ekle',
    tags: ['Places'],
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', minLength: 3, maxLength: 200 },
              description: { type: 'string', minLength: 10, maxLength: 5000 },
              category: { type: 'string' },
              address: { type: 'string' },
              latitude: { type: 'number', minimum: -90, maximum: 90 },
              longitude: { type: 'number', minimum: -180, maximum: 180 },
              images: { type: 'array', items: { type: 'string' } },
            },
            required: ['name', 'description', 'category', 'latitude', 'longitude'],
          },
        },
      },
    },
    responses: {
      '201': { description: 'Oluşturuldu' },
      '401': { description: 'Yetkisiz' },
      '422': { description: 'Doğrulama hatası' },
    },
  });

  // Reviews endpoints
  addPath(doc, '/places/{id}/reviews', 'get', {
    summary: 'Mekan değerlendirmeleri',
    tags: ['Reviews'],
    parameters: [
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'page', in: 'query', schema: { type: 'integer' } },
      { name: 'limit', in: 'query', schema: { type: 'integer' } },
    ],
    responses: {
      '200': { description: 'Başarılı' },
    },
  });

  addPath(doc, '/places/{id}/reviews', 'post', {
    summary: 'Değerlendirme ekle',
    tags: ['Reviews'],
    security: [{ bearerAuth: [] }],
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              rating: { type: 'integer', minimum: 1, maximum: 5 },
              comment: { type: 'string', minLength: 10, maxLength: 2000 },
            },
            required: ['rating', 'comment'],
          },
        },
      },
    },
    responses: {
      '201': { description: 'Oluşturuldu' },
      '401': { description: 'Yetkisiz' },
    },
  });

  // Search endpoint
  addPath(doc, '/search', 'get', {
    summary: 'Genel arama',
    tags: ['Search'],
    parameters: [
      { name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2 }, description: 'Arama sorgusu' },
      { name: 'type', in: 'query', schema: { type: 'string', enum: ['places', 'blog', 'all'] } },
      { name: 'limit', in: 'query', schema: { type: 'integer' } },
    ],
    responses: {
      '200': { description: 'Başarılı' },
      '400': { description: 'Geçersiz sorgu' },
    },
  });

  // Auth endpoints
  addPath(doc, '/auth/login', 'post', {
    summary: 'Giriş yap',
    tags: ['Auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 6 },
            },
            required: ['email', 'password'],
          },
        },
      },
    },
    responses: {
      '200': { description: 'Giriş başarılı' },
      '401': { description: 'Geçersiz kimlik bilgileri' },
    },
  });

  addPath(doc, '/auth/register', 'post', {
    summary: 'Kayıt ol',
    tags: ['Auth'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 8 },
              fullName: { type: 'string', minLength: 2 },
            },
            required: ['email', 'password', 'fullName'],
          },
        },
      },
    },
    responses: {
      '201': { description: 'Kayıt başarılı' },
      '409': { description: 'E-posta zaten kullanımda' },
    },
  });

  // User endpoints
  addPath(doc, '/users/me', 'get', {
    summary: 'Mevcut kullanıcı bilgisi',
    tags: ['Users'],
    security: [{ bearerAuth: [] }],
    responses: {
      '200': { description: 'Başarılı' },
      '401': { description: 'Yetkisiz' },
    },
  });

  return doc;
}

/**
 * Export OpenAPI document to JSON
 */
export function exportToJSON(doc: OpenAPIDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Export OpenAPI document to YAML (simplified)
 */
export function exportToYAML(doc: OpenAPIDocument): string {
  // Simple YAML conversion (for full YAML support, use a library like js-yaml)
  return `# Şanlıurfa API OpenAPI Specification
# Generated automatically

openapi: ${doc.openapi}
info:
  title: ${doc.info.title}
  version: ${doc.info.version}
  description: ${doc.info.description || ''}

# For full YAML output, use the JSON endpoint and convert with js-yaml
# This is a simplified representation
`;
}
