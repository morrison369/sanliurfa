import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GET as getOpenApi } from '../../src/pages/api/docs/openapi.json';

const errors: string[] = [];
const root = process.cwd();

if (!existsSync(resolve(root, 'src/lib/__tests__/openapi-city-services-contract.test.ts'))) {
  errors.push('src/lib/__tests__/openapi-city-services-contract.test.ts: missing');
}

const requiredPaths = [
  '/social/messages',
  '/social/swipe',
  '/social/follow',
  '/transport/status',
  '/saglik/nobetci',
  '/weather/current',
  '/weather/status',
];

try {
  const response = await getOpenApi({} as any);
  if (response.status !== 200) {
    errors.push(`openapi status expected 200, got ${response.status}`);
  } else {
    const spec = await response.json();
    for (const pathKey of requiredPaths) {
      if (!spec?.paths?.[pathKey]) {
        errors.push(`openapi missing path "${pathKey}"`);
      }
    }
  }
} catch (error) {
  errors.push(`openapi parse failed: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length) {
  console.error('[openapi-city-services-gate] FAILED');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('[openapi-city-services-gate] ok');

