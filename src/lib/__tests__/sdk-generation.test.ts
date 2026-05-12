/**
 * Unit Tests — sdk/generation.ts
 *
 * - SDKGenerator (validateSpec OpenAPI shape + generate TypeScript/JavaScript SDK string)
 *   - methodName: route → camelCase function name
 *   - generate: header + typeBlock + client class + per-route helpers
 */

import { describe, it, expect } from 'vitest';
import { SDKGenerator } from '../sdk/generation';

describe('SDKGenerator', () => {
  it('validateSpec — geçerli OpenAPI → true', () => {
    const g = new SDKGenerator();
    expect(g.validateSpec({ openapi: '3.0.0', paths: { '/test': { get: {} } } })).toBe(true);
  });

  it('validateSpec — null → false', () => {
    expect(new SDKGenerator().validateSpec(null)).toBe(false);
  });

  it('validateSpec — paths yok → false', () => {
    expect(new SDKGenerator().validateSpec({ openapi: '3.0.0' })).toBe(false);
  });

  it('validateSpec — openapi field eksik → false', () => {
    expect(new SDKGenerator().validateSpec({ paths: {} })).toBe(false);
  });

  it('generate — TypeScript SDK header', () => {
    const g = new SDKGenerator();
    const code = g.generate({
      language: 'typescript', outputPath: '/x', packageName: 'TestPkg',
      spec: { paths: { '/test': { get: {} } } },
    });
    expect(code).toContain('Generated SDK for TestPkg');
    expect(code).toContain('export interface RequestOptions');
    expect(code).toContain('SanliurfaClient');
  });

  it('generate — JavaScript: typeBlock yok', () => {
    const g = new SDKGenerator();
    const code = g.generate({
      language: 'javascript', outputPath: '/x', packageName: 'JsPkg',
      spec: { paths: { '/test': { get: {} } } },
    });
    expect(code).not.toContain('export interface RequestOptions');
    expect(code).toContain('SanliurfaClient');
  });

  it('generate — boş spec → sadece client class', () => {
    const code = new SDKGenerator().generate({
      language: 'typescript', outputPath: '/x', packageName: 'Empty',
    });
    expect(code).toContain('SanliurfaClient');
  });

  it('generate — methodName: GET /api/users → getUsers', () => {
    const code = new SDKGenerator().generate({
      language: 'typescript', outputPath: '/x', packageName: 'X',
      spec: { paths: { '/api/users': { get: {} } } },
    });
    expect(code).toContain('export const getUsers');
  });

  it('generate — methodName: POST /api/places/{id}/photos → postPlacesIdPhotos', () => {
    const code = new SDKGenerator().generate({
      language: 'typescript', outputPath: '/x', packageName: 'X',
      spec: { paths: { '/api/places/{id}/photos': { post: {} } } },
    });
    expect(code).toContain('postPlacesIdPhotos');
  });

  it('generate — multiple methods aynı route', () => {
    const code = new SDKGenerator().generate({
      language: 'typescript', outputPath: '/x', packageName: 'X',
      spec: { paths: { '/api/x': { get: {}, post: {} } } },
    });
    expect(code).toContain('getX');
    expect(code).toContain('postX');
  });

  it('generate — path empty / → "Root" suffix', () => {
    const code = new SDKGenerator().generate({
      language: 'typescript', outputPath: '/x', packageName: 'X',
      spec: { paths: { '/': { get: {} } } },
    });
    // path "/" → tüm karakterler split sonrası boş → "Root" fallback
    expect(code).toContain('getRoot');
  });
});
