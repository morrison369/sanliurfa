import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import { GET as getOpenApiSpec } from '../src/pages/api/openapi.json';

async function main(): Promise<void> {
  const response = await getOpenApiSpec({} as any);
  const schema = await response.json();
  const outputAst = await openapiTS(schema, {
    alphabetize: true,
  });
  const expected = ['// This file is generated. Do not edit manually.', astToString(outputAst), ''].join('\n');
  const targetPath = resolve(process.cwd(), 'src', 'types', 'generated-admin-api.ts');
  const current = readFileSync(targetPath, 'utf8');

  if (current !== expected) {
    throw new Error('generated admin api types are stale; run `npm run types:admin:generate`');
  }

  console.log('generated admin api types are up to date');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
