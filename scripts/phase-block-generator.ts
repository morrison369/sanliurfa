import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

export interface GeneratedPhaseFiles {
  doc: string;
  test: string;
  exports: string;
  modules: Record<string, string>;
}

export function buildPhaseScriptEntry(start: number, end: number, testFile: string): string {
  return `\"test:phase:${start}-${end}\": \"vitest run --pool=threads --environment node ${testFile}\"`;
}

export function buildPhaseIndexEntry(docFile: string): string {
  return `- \`${docFile}\``;
}

function lowerFirst(value: string): string {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function getMemberNames(module: PhaseModuleConfig, version: number): Record<string, string> {
  const base = module.exportBase;
  const lower = lowerFirst(base);
  const versionSuffix = `V${version}`;
  const signalInterface = `${base}Signal${versionSuffix}`;

  switch (module.mode) {
    case 'router':
      return {
        signalInterface,
        bookClass: `${base}Book${versionSuffix}`,
        workerClass: `${base}Scorer${versionSuffix}`,
        gateClass: `${base}Router${versionSuffix}`,
        reporterClass: `${base}Reporter${versionSuffix}`,
        bookConst: `${lower}Book${versionSuffix}`,
        workerConst: `${lower}Scorer${versionSuffix}`,
        gateConst: `${lower}Router${versionSuffix}`,
        reporterConst: `${lower}Reporter${versionSuffix}`,
        workerMethod: 'score',
        gateMethod: 'route'
      };
    case 'harmonizer':
      return {
        signalInterface,
        bookClass: `${base}Book${versionSuffix}`,
        workerClass: `${base}Harmonizer${versionSuffix}`,
        gateClass: `${base}Gate${versionSuffix}`,
        reporterClass: `${base}Reporter${versionSuffix}`,
        bookConst: `${lower}Book${versionSuffix}`,
        workerConst: `${lower}Harmonizer${versionSuffix}`,
        gateConst: `${lower}Gate${versionSuffix}`,
        reporterConst: `${lower}Reporter${versionSuffix}`,
        workerMethod: 'harmonize',
        gateMethod: 'pass'
      };
    case 'forecaster':
      return {
        signalInterface,
        bookClass: `${base}Book${versionSuffix}`,
        workerClass: `${base}Forecaster${versionSuffix}`,
        gateClass: `${base}Gate${versionSuffix}`,
        reporterClass: `${base}Reporter${versionSuffix}`,
        bookConst: `${lower}Book${versionSuffix}`,
        workerConst: `${lower}Forecaster${versionSuffix}`,
        gateConst: `${lower}Gate${versionSuffix}`,
        reporterConst: `${lower}Reporter${versionSuffix}`,
        workerMethod: 'forecast',
        gateMethod: 'stable'
      };
    case 'coordinator':
      return {
        signalInterface,
        bookClass: `${base}Book${versionSuffix}`,
        workerClass: `${base}Coordinator${versionSuffix}`,
        gateClass: `${base}Gate${versionSuffix}`,
        reporterClass: `${base}Reporter${versionSuffix}`,
        bookConst: `${lower}Book${versionSuffix}`,
        workerConst: `${lower}Coordinator${versionSuffix}`,
        gateConst: `${lower}Gate${versionSuffix}`,
        reporterConst: `${lower}Reporter${versionSuffix}`,
        workerMethod: 'coordinate',
        gateMethod: 'pass'
      };
    case 'engine':
      return {
        signalInterface,
        bookClass: `${base}Book${versionSuffix}`,
        workerClass: `${base}Engine${versionSuffix}`,
        gateClass: `${base}Gate${versionSuffix}`,
        reporterClass: `${base}Reporter${versionSuffix}`,
        bookConst: `${lower}Book${versionSuffix}`,
        workerConst: `${lower}Engine${versionSuffix}`,
        gateConst: `${lower}Gate${versionSuffix}`,
        reporterConst: `${lower}Reporter${versionSuffix}`,
        workerMethod: 'evaluate',
        gateMethod: 'stable'
      };
  }
}

export function buildModuleExportBlock(module: PhaseModuleConfig, version: number): string {
  const names = getMemberNames(module, version);
  const importPath = `./${module.fileName.replace(/\.ts$/, '')}`;
  return `// Phase ${module.phase}: ${module.title}\nexport { ${names.bookClass}, ${names.workerClass}, ${names.gateClass}, ${names.reporterClass}, ${names.bookConst}, ${names.workerConst}, ${names.gateConst}, ${names.reporterConst} } from '${importPath}';`;
}

export function buildPhaseDoc(config: PhaseBlockConfig): string {
  const scope = config.modules.map((module) => `- Phase ${module.phase}: ${module.title}`).join('\n');
  return `# Phase ${config.start}-${config.end}: ${config.title}\n\n## Scope\n${scope}\n\n## Deliverables\n- ${config.modules.length} library modules under \`src/lib/\`\n- 24 Vitest assertions in \`${config.testFile}\`\n- export surface updates in \`src/lib/index.ts\`\n- tracker updates in \`PHASE_INDEX.md\`, \`TASK_TRACKER.md\`, and \`memory.md\`\n\n## Verification\n- \`npm run phase:sync:tsconfig\`\n- \`npm run phase:check:tsconfig\`\n- \`npm run test:phase:${config.start}-${config.end}\`\n- \`npm run test:phase:smoke\`\n- \`npm run test:phase:gate:ci\`\n\n## Notes\n- V${config.version} advances the same governance-kit contract surface to keep scorer, router, gate, and report compatibility stable.\n- \`test:phase:latest\` advances to the V${config.version} suite through the existing phase runner automation.\n`;
}

export function buildPhaseModuleSource(module: PhaseModuleConfig, version: number): string {
  const names = getMemberNames(module, version);
  const [primaryField, secondaryField, costField] = module.signalFields;
  const fields = [
    '  signalId: string;',
    `  ${primaryField}: number;`,
    `  ${secondaryField}: number;`,
    `  ${costField}: number;`
  ].join('\n');

  if (module.mode === 'router') {
    const [highLabel, mediumLabel, reviewLabel] = module.routeLabels ?? ['priority', 'balanced', 'review'];
    return `/**\n * Phase ${module.phase}: ${module.title}\n */\n\nimport { SignalBook, computeBalancedScore, routeByThresholds, buildGovernanceReport } from './governance-kit';\n\nexport interface ${names.signalInterface} {\n${fields}\n}\n\nclass ${names.bookClass} extends SignalBook<${names.signalInterface}> {}\n\nclass ${names.workerClass} {\n  ${names.workerMethod}(signal: ${names.signalInterface}): number {\n    return computeBalancedScore(signal.${primaryField}, signal.${secondaryField}, signal.${costField});\n  }\n}\n\nclass ${names.gateClass} {\n  ${names.gateMethod}(signal: ${names.signalInterface}): string {\n    return routeByThresholds(\n      signal.${secondaryField},\n      signal.${primaryField},\n      85,\n      70,\n      '${highLabel}',\n      '${mediumLabel}',\n      '${reviewLabel}'\n    );\n  }\n}\n\nclass ${names.reporterClass} {\n  report(signalId: string, route: string): string {\n    return buildGovernanceReport('${module.reportLabel}', signalId, 'route', route, '${module.reportMessage}');\n  }\n}\n\nexport const ${names.bookConst} = new ${names.bookClass}();\nexport const ${names.workerConst} = new ${names.workerClass}();\nexport const ${names.gateConst} = new ${names.gateClass}();\nexport const ${names.reporterConst} = new ${names.reporterClass}();\n\nexport {\n  ${names.bookClass},\n  ${names.workerClass},\n  ${names.gateClass},\n  ${names.reporterClass}\n};\n`;
  }

  return `/**\n * Phase ${module.phase}: ${module.title}\n */\n\nimport { SignalBook, computeBalancedScore, scorePasses, buildGovernanceReport } from './governance-kit';\n\nexport interface ${names.signalInterface} {\n${fields}\n}\n\nclass ${names.bookClass} extends SignalBook<${names.signalInterface}> {}\n\nclass ${names.workerClass} {\n  ${names.workerMethod}(signal: ${names.signalInterface}): number {\n    return computeBalancedScore(signal.${primaryField}, signal.${secondaryField}, signal.${costField});\n  }\n}\n\nclass ${names.gateClass} {\n  ${names.gateMethod}(score: number, threshold: number): boolean {\n    return scorePasses(score, threshold);\n  }\n}\n\nclass ${names.reporterClass} {\n  report(signalId: string, score: number): string {\n    return buildGovernanceReport('${module.reportLabel}', signalId, 'score', score, '${module.reportMessage}');\n  }\n}\n\nexport const ${names.bookConst} = new ${names.bookClass}();\nexport const ${names.workerConst} = new ${names.workerClass}();\nexport const ${names.gateConst} = new ${names.gateClass}();\nexport const ${names.reporterConst} = new ${names.reporterClass}();\n\nexport {\n  ${names.bookClass},\n  ${names.workerClass},\n  ${names.gateClass},\n  ${names.reporterClass}\n};\n`;
}

function buildSignalObject(module: PhaseModuleConfig, signalId: string): string {
  const [primaryField, secondaryField, costField] = module.signalFields;
  return `{ signalId: '${signalId}', ${primaryField}: 88, ${secondaryField}: 84, ${costField}: 20 }`;
}

export function buildPhaseTestSuite(config: PhaseBlockConfig): string {
  const imports = config.modules
    .map((module) => {
      const names = getMemberNames(module, config.version);
      return `import {\n  ${names.bookConst},\n  ${names.workerConst},\n  ${names.gateConst},\n  ${names.reporterConst}\n} from '../${module.fileName.replace(/\.ts$/, '')}';`;
    })
    .join('\n');

  const blocks = config.modules
    .map((module) => {
      const names = getMemberNames(module, config.version);
      const label = module.reportLabel.toLowerCase();
      const signalBase = `p${module.phase}`;
      const objectA = buildSignalObject(module, `${signalBase}a`);
      const objectB = buildSignalObject(module, `${signalBase}b`);
      const objectC = buildSignalObject(module, `${signalBase}c`);
      const reporterValue = module.mode === 'router' ? `'${module.routeLabels?.[1] ?? 'balanced'}'` : '66';
      const workerAssertion = module.mode === 'router' ? 'score' : 'score';
      const gateCall = module.mode === 'router'
        ? `${names.gateConst}.${names.gateMethod}(${objectC})`
        : `${names.gateConst}.${names.gateMethod}(66, 60)`;
      const gateExpectation = module.mode === 'router'
        ? `'${module.routeLabels?.[1] ?? 'balanced'}'`
        : 'true';
      const workerLabel = module.mode === 'router'
        ? `scores ${label}`
        : `${names.workerMethod}s ${label}`;
      const gateLabel = module.mode === 'router'
        ? `routes ${label}`
        : `checks ${label} gate`;
      const reportLabel = module.mode === 'router'
        ? `reports ${label} route`
        : `reports ${label} score`;
      return `describe('Phase ${module.phase}: ${module.title}', () => {\n  it('stores ${label} signal', () => {\n    const signal = ${names.bookConst}.add(${objectA});\n    expect(signal.signalId).toBe('${signalBase}a');\n  });\n\n  it('${workerLabel}', () => {\n    const score = ${names.workerConst}.${names.workerMethod}(${objectB});\n    expect(score).toBe(66);\n  });\n\n  it('${gateLabel}', () => {\n    const result = ${gateCall};\n    expect(result).toBe(${gateExpectation});\n  });\n\n  it('${reportLabel}', () => {\n    const report = ${names.reporterConst}.report('${signalBase}a', ${reporterValue});\n    expect(report).toContain('${signalBase}a');\n  });\n});`;
    })
    .join('\n\n');

  return `import { describe, it, expect } from 'vitest';\n${imports}\n\n${blocks}\n`;
}

export function buildGeneratedPhaseFiles(config: PhaseBlockConfig): GeneratedPhaseFiles {
  return {
    doc: buildPhaseDoc(config),
    test: buildPhaseTestSuite(config),
    exports: config.modules.map((module) => buildModuleExportBlock(module, config.version)).join('\n\n'),
    modules: Object.fromEntries(config.modules.map((module) => [module.fileName, buildPhaseModuleSource(module, config.version)]))
  };
}

export function writeGeneratedPhaseFiles(root: string, config: PhaseBlockConfig): GeneratedPhaseFiles {
  const generated = buildGeneratedPhaseFiles(config);
  const rootPath = resolve(root);

  mkdirSync(resolve(rootPath, dirname(config.docFile)), { recursive: true });
  writeFileSync(resolve(rootPath, config.docFile), generated.doc, 'utf8');

  mkdirSync(resolve(rootPath, dirname(config.testFile)), { recursive: true });
  writeFileSync(resolve(rootPath, config.testFile), generated.test, 'utf8');

  for (const [fileName, source] of Object.entries(generated.modules)) {
    const target = resolve(rootPath, 'src/lib', fileName);
    mkdirSync(resolve(rootPath, dirname(`src/lib/${fileName}`)), { recursive: true });
    writeFileSync(target, source, 'utf8');
  }

  return generated;
}

export function loadPhaseBlockConfig(configPath: string): PhaseBlockConfig {
  return JSON.parse(readFileSync(resolve(configPath), 'utf8')) as PhaseBlockConfig;
}

export function main(): void {
  const configArg = process.argv[2];
  const shouldWrite = process.argv.includes('--write');
  if (!configArg) {
    process.stdout.write('Usage: tsx scripts/phase-block-generator.ts <config.json> [--write]\n');
    return;
  }

  const config = loadPhaseBlockConfig(configArg);
  const generated = shouldWrite ? writeGeneratedPhaseFiles(process.cwd(), config) : buildGeneratedPhaseFiles(config);

  process.stdout.write(`${buildPhaseScriptEntry(config.start, config.end, config.testFile)}\n\n`);
  process.stdout.write(`${buildPhaseIndexEntry(config.docFile)}\n\n`);
  process.stdout.write(`${generated.exports}\n\n`);
  process.stdout.write(`${generated.doc}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
