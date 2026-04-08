import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type PhaseModuleMode = 'router' | 'harmonizer' | 'forecaster' | 'coordinator' | 'engine';

export interface PhaseModuleConfig {
  phase: number;
  title: string;
  fileName: string;
  exportBase: string;
  reportLabel: string;
  reportMessage: string;
  mode: PhaseModuleMode;
  signalFields: [string, string, string];
  routeLabels?: [string, string, string];
}

export interface PhaseBlockConfig {
  start: number;
  end: number;
  version: number;
  docFile: string;
  testFile: string;
  title: string;
  modules: PhaseModuleConfig[];
}

export function buildPhaseScriptEntry(start: number, end: number, testFile: string): string {
  return `\"test:phase:${start}-${end}\": \"vitest run --pool=threads --environment node ${testFile}\"`;
}

export function buildPhaseIndexEntry(docFile: string): string {
  return `- \`${docFile}\``;
}

export function buildModuleExportBlock(module: PhaseModuleConfig): string {
  const suffixMap: Record<PhaseModuleMode, string[]> = {
    router: ['Book', 'Scorer', 'Router', 'Reporter'],
    harmonizer: ['Book', 'Harmonizer', 'Gate', 'Reporter'],
    forecaster: ['Book', 'Forecaster', 'Gate', 'Reporter'],
    coordinator: ['Book', 'Coordinator', 'Gate', 'Reporter'],
    engine: ['Book', 'Engine', 'Gate', 'Reporter']
  };
  const [a, b, c, d] = suffixMap[module.mode];
  const base = module.exportBase;
  const camel = base.charAt(0).toLowerCase() + base.slice(1);
  const importPath = `./${module.fileName.replace(/\.ts$/, '')}`;
  return `// Phase ${module.phase}: ${module.title}\nexport { ${base}${a}, ${base}${b}, ${base}${c}, ${base}${d}, ${camel}${a}, ${camel}${b}, ${camel}${c}, ${camel}${d} } from '${importPath}';`;
}

export function buildPhaseDoc(config: PhaseBlockConfig): string {
  const scope = config.modules.map((module) => `- Phase ${module.phase}: ${module.title}`).join('\n');
  return `# Phase ${config.start}-${config.end}: ${config.title}\n\n## Scope\n${scope}\n\n## Deliverables\n- ${config.modules.length} library modules under \`src/lib/\`\n- 24 Vitest assertions in \`${config.testFile}\`\n- export surface updates in \`src/lib/index.ts\`\n- tracker updates in \`PHASE_INDEX.md\`, \`TASK_TRACKER.md\`, and \`memory.md\`\n\n## Verification\n- \`npm run phase:sync:tsconfig\`\n- \`npm run phase:check:tsconfig\`\n- \`npm run test:phase:${config.start}-${config.end}\`\n- \`npm run test:phase:smoke\`\n- \`npm run test:phase:gate:ci\`\n`;
}

export function loadPhaseBlockConfig(configPath: string): PhaseBlockConfig {
  return JSON.parse(readFileSync(resolve(configPath), 'utf8')) as PhaseBlockConfig;
}

export function main(): void {
  const configArg = process.argv[2];
  if (!configArg) {
    process.stdout.write('Usage: tsx scripts/phase-block-generator.ts <config.json>\n');
    return;
  }

  const config = loadPhaseBlockConfig(configArg);
  process.stdout.write(`${buildPhaseScriptEntry(config.start, config.end, config.testFile)}\n\n`);
  process.stdout.write(`${buildPhaseIndexEntry(config.docFile)}\n\n`);
  process.stdout.write(`${buildPhaseDoc(config)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
