import { describe, expect, it } from 'vitest';
import { GET as getOpenApi } from '../../pages/api/docs/openapi.json';

const ALLOWED_ERROR_REFS = new Set([
  '#/components/schemas/Error',
  '#/components/schemas/ErrorBasic',
  '#/components/schemas/ErrorFlagged',
  '#/components/schemas/ErrorApi',
]);

function isErrorStatus(statusCode: string): boolean {
  const status = Number(statusCode);
  return Number.isInteger(status) && status >= 400;
}

describe('openapi error envelope guard', () => {
  it('uses only shared error schemas for error responses', async () => {
    const response = await getOpenApi({} as any);
    expect(response.status).toBe(200);

    const spec = await response.json();
    const paths = spec?.paths ?? {};
    const violations: string[] = [];

    for (const [path, operations] of Object.entries<any>(paths)) {
      for (const [method, operation] of Object.entries<any>(operations ?? {})) {
        if (!operation?.responses) continue;

        for (const [statusCode, resp] of Object.entries<any>(operation.responses)) {
          if (!isErrorStatus(statusCode)) continue;
          const schema = resp?.content?.['application/json']?.schema;
          if (!schema) continue;

          if (schema.$ref) {
            if (!ALLOWED_ERROR_REFS.has(schema.$ref)) {
              violations.push(`${method.toUpperCase()} ${path} ${statusCode} -> ${schema.$ref}`);
            }
            continue;
          }

          if (Array.isArray(schema.oneOf)) {
            for (const oneOfItem of schema.oneOf) {
              const ref = oneOfItem?.$ref;
              if (!ref || !ALLOWED_ERROR_REFS.has(ref)) {
                violations.push(`${method.toUpperCase()} ${path} ${statusCode} -> oneOf invalid ref`);
              }
            }
            continue;
          }

          violations.push(`${method.toUpperCase()} ${path} ${statusCode} -> inline schema not allowed`);
        }
      }
    }

    expect(
      violations,
      `Paylaşılan hata envelope şeması ihlalleri:\n${violations.join('\n')}`
    ).toEqual([]);
  });
});

