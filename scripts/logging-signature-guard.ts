import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.astro']);
const LOGGER_METHODS = new Set(['debug', 'info', 'warn', 'error']);

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    if (SCAN_EXTENSIONS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function main(): void {
  const root = process.cwd();
  const srcDir = resolve(root, 'src');
  const offenders: string[] = [];

  for (const file of collectFiles(srcDir)) {
    const source = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const target = node.expression.expression;
        const method = node.expression.name.text;
        if (ts.isIdentifier(target) && target.text === 'logger' && LOGGER_METHODS.has(method)) {
          if (node.arguments.length < 1 || node.arguments.length > 3) {
            const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            offenders.push(`${relative(root, file)}:${line + 1}:${character + 1} logger.${method}(${node.arguments.length} args)`);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  if (offenders.length > 0) {
    throw new Error(['logging signature guard failed', ...offenders.slice(0, 50)].join('\n'));
  }

  console.log('logging-signature-guard: OK');
}

main();
