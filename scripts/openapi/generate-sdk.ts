import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GET as getOpenApi } from '../../src/pages/api/docs/openapi.json';
import { SDKGenerator } from '../../src/lib/sdk/generation';

async function main() {
  const response = await getOpenApi({} as any);
  if (response.status !== 200) {
    throw new Error(`OpenAPI alınamadı (status=${response.status})`);
  }
  const spec = await response.json();

  const generator = new SDKGenerator();
  if (!generator.validateSpec(spec)) {
    throw new Error('OpenAPI spec geçersiz');
  }

  const outDir = join(process.cwd(), 'sdk', 'generated');
  mkdirSync(outDir, { recursive: true });

  const tsClient = generator.generate({
    language: 'typescript',
    outputPath: outDir,
    packageName: '@sanliurfa/sdk',
    spec,
  });
  const jsClient = generator.generate({
    language: 'javascript',
    outputPath: outDir,
    packageName: '@sanliurfa/sdk',
    spec,
  });

  writeFileSync(join(outDir, 'client.ts'), tsClient, 'utf8');
  writeFileSync(join(outDir, 'client.js'), jsClient, 'utf8');
  writeFileSync(
    join(outDir, 'openapi-summary.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        pathCount: Object.keys(spec?.paths || {}).length,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`sdk generated: ${outDir}`);
}

main().catch((error) => {
  console.error(`sdk generation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
