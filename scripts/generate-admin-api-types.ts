import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import openapiTS, { astToString } from 'openapi-typescript';
import { GET as getOpenApiSpec } from '../src/pages/api/openapi.json';

async function main(): Promise<void> {
  const response = await getOpenApiSpec({} as any);
  const schema = await response.json();
  const outputAst = await openapiTS(schema, {
    alphabetize: true,
  });
  const output = astToString(outputAst);

  const targetPath = resolve(process.cwd(), 'src', 'types', 'generated-admin-api.ts');
  writeFileSync(
    targetPath,
    [
      '// This file is generated. Do not edit manually.',
      output,
      '',
    ].join('\n'),
    'utf8'
  );

  console.log(`generated admin api types -> ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
