import { describe, it, expect } from 'vitest';
import {
  createOpenAPIDocument,
  addPath,
  addSchema,
  generateSanliurfaAPIDoc,
  exportToJSON,
  schemas,
} from './index';

describe('OpenAPI Generator', () => {
  describe('createOpenAPIDocument', () => {
    it('should create basic OpenAPI document', () => {
      const doc = createOpenAPIDocument(
        { title: 'Test API', version: '1.0.0' },
        [{ url: 'https://api.test.com' }]
      );

      expect(doc.openapi).toBe('3.0.3');
      expect(doc.info.title).toBe('Test API');
      expect(doc.info.version).toBe('1.0.0');
      expect(doc.servers).toHaveLength(1);
      expect(doc.paths).toEqual({});
    });

    it('should include default security schemes', () => {
      const doc = createOpenAPIDocument({ title: 'Test', version: '1.0.0' });

      expect(doc.components?.securitySchemes).toHaveProperty('bearerAuth');
      expect(doc.components?.securitySchemes).toHaveProperty('apiKeyAuth');
    });
  });

  describe('addPath', () => {
    it('should add path to document', () => {
      const doc = createOpenAPIDocument({ title: 'Test', version: '1.0.0' });
      
      addPath(doc, '/test', 'get', {
        summary: 'Test endpoint',
        responses: { '200': { description: 'Success' } },
      });

      expect(doc.paths['/test']).toHaveProperty('get');
      expect(doc.paths['/test'].get.summary).toBe('Test endpoint');
    });
  });

  describe('addSchema', () => {
    it('should add schema to components', () => {
      const doc = createOpenAPIDocument({ title: 'Test', version: '1.0.0' });
      
      addSchema(doc, 'TestSchema', {
        type: 'object',
        properties: { name: { type: 'string' } },
      });

      expect(doc.components?.schemas).toHaveProperty('TestSchema');
    });
  });

  describe('generateSanliurfaAPIDoc', () => {
    it('should generate complete API documentation', () => {
      const doc = generateSanliurfaAPIDoc();

      expect(doc.info.title).toBe('Şanlıurfa API');
      expect(doc.tags).toBeDefined();
      expect(doc.tags?.length).toBeGreaterThan(0);
      
      // Check common paths exist
      expect(doc.paths).toHaveProperty('/places');
      expect(doc.paths).toHaveProperty('/auth/login');
      expect(doc.paths).toHaveProperty('/search');
    });

    it('should include common schemas', () => {
      const doc = generateSanliurfaAPIDoc();

      expect(doc.components?.schemas).toHaveProperty('User');
      expect(doc.components?.schemas).toHaveProperty('Place');
      expect(doc.components?.schemas).toHaveProperty('Review');
      expect(doc.components?.schemas).toHaveProperty('Error');
    });
  });

  describe('exportToJSON', () => {
    it('should export document as JSON string', () => {
      const doc = createOpenAPIDocument({ title: 'Test', version: '1.0.0' });
      const json = exportToJSON(doc);

      expect(typeof json).toBe('string');
      expect(JSON.parse(json)).toEqual(doc);
    });
  });

  describe('schemas', () => {
    it('should have User schema', () => {
      expect(schemas.User.type).toBe('object');
      expect(schemas.User.properties).toHaveProperty('id');
      expect(schemas.User.properties).toHaveProperty('email');
    });

    it('should have Place schema', () => {
      expect(schemas.Place.type).toBe('object');
      expect(schemas.Place.properties).toHaveProperty('name');
      expect(schemas.Place.properties).toHaveProperty('rating');
    });
  });
});
