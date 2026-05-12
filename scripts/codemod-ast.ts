#!/usr/bin/env npx tsx
/**
 * AST Codemod: TypeScript tabanlı validation anti-pattern fixer
 *
 * Regex codemod'dan farkları:
 *   • Optional chaining (body?.x) dahil tüm expression türleri
 *   • Operator precedence sorunlarına karşı güvenli (parantez doğru eklenir)
 *   • ts-morph ile gerçek AST traversal — false positive yok
 *   • Hem basit identifier hem property access (body.x, body?.x) destekli
 *
 * Düzeltilen pattern'ler:
 *   1. String(x).length OP N          → typeof x !== 'string' || x.length OP N
 *   2. x && String(x).length OP N     → x !== undefined && x !== null && (typeof ...)
 *   3. x !== undefined && String(x)…  → x !== undefined && x !== null && (typeof ...)
 *   4. x && x.length OP N             → x !== undefined && x !== null && (typeof ...)
 *   5. x && !SET.has(x)               → x !== undefined && x !== null && (typeof ...)
 *   6. x !== undefined && !SET.has(x) → x !== undefined && x !== null && (typeof ...)
 *   7. x?.toString?.()                → typeof x === 'string' ? x : null
 *
 * Kullanım:
 *   npx tsx scripts/codemod-ast.ts            # uygula
 *   npx tsx scripts/codemod-ast.ts --dry-run  # önizle
 *   npx tsx scripts/codemod-ast.ts --verbose  # detaylı çıktı
 */

import { Project, SyntaxKind, Node, BinaryExpression, LogicalExpression } from 'ts-morph';
import { relative, resolve } from 'node:path';

const isDryRun = process.argv.includes('--dry-run');
const isVerbose = process.argv.includes('--verbose');

const project = new Project({
  tsConfigFilePath: resolve(process.cwd(), 'tsconfig.json'),
  skipAddingFilesFromTsConfig: true,
});
project.addSourceFilesAtPaths('src/pages/api/**/*.ts');

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/** Nokta notasyonu ve optional chaining normalizer: body?.x → body.x */
function normalizeSource(src: string): string {
  return src.replace(/\?\./g, '.');
}

/** x, body.x, body?.x gibi "tek alan" expression mı? */
function isSimpleAccess(node: Node): boolean {
  if (Node.isIdentifier(node)) return true;
  if (Node.isPropertyAccessExpression(node)) return true;
  if (Node.isElementAccessExpression(node)) return false;
  return false;
}

/** İki AST node'un aynı "değişkeni" mi ifade ettiğini kontrol et */
function sameVar(a: Node, b: Node): boolean {
  return normalizeSource(a.getText()) === normalizeSource(b.getText());
}

type Replacement = { start: number; end: number; text: string; description: string };

// ─── Pattern tespiti ve replacement üretimi ───────────────────────────────────

function collectReplacements(sourceFile: ReturnType<typeof project.getSourceFiles>[0]): Replacement[] {
  const replacements: Replacement[] = [];

  function push(node: Node, text: string, description: string) {
    replacements.push({
      start: node.getStart(),
      end: node.getEnd(),
      text,
      description,
    });
  }

  // Traverse all binary expressions
  sourceFile.forEachDescendant((node) => {
    // ── Pattern 7: x?.toString?.() VariableDeclarator ─────────────────────
    if (Node.isVariableDeclaration(node)) {
      const init = node.getInitializer();
      if (!init) return;
      if (Node.isCallExpression(init) || (init.getKind() === SyntaxKind.CallExpression)) {
        // handled below
      }
      // Chain: x?.toString?.()
      const initText = init.getText();
      if (initText.includes('?.toString?.()')) {
        const srcMatch = initText.match(/^([\w?.]+)\.toString\?\.?\(\)$/);
        if (srcMatch) {
          const src = srcMatch[1].replace(/\?\./g, '.');
          push(init, `typeof ${src} === 'string' ? ${src} : null`, 'toString?.() coercion');
        }
      }
      return;
    }

    // ── LogicalExpression patterns ─────────────────────────────────────────
    if (!Node.isBinaryExpression(node)) return;

    const binNode = node as BinaryExpression;
    const opToken = binNode.getOperatorToken().getText().trim();

    if (opToken === '&&') {
      const left = binNode.getLeft();
      const right = binNode.getRight();
      const leftSrc = left.getText();
      const normLeftSrc = normalizeSource(leftSrc);

      // ── x !== undefined && !SET.has(x) ──────────────────────────────────
      if (Node.isBinaryExpression(left) && left.getOperatorToken().getText().trim() === '!==') {
        const leftLeft = left.getLeft();
        const leftRight = left.getRight();
        if (leftRight.getText() === 'undefined' && isSimpleAccess(leftLeft)) {
          const varSrc = leftLeft.getText();
          const normVar = normalizeSource(varSrc);
          // right = !SET.has(varSrc)
          if (
            Node.isPrefixUnaryExpression(right) &&
            right.getOperatorToken() === SyntaxKind.ExclamationToken
          ) {
            const inner = right.getOperand();
            if (
              Node.isCallExpression(inner) &&
              normalizeSource(inner.getText()).endsWith(`.has(${normVar})`)
            ) {
              const callExpr = inner.getExpression();
              if (Node.isPropertyAccessExpression(callExpr) && callExpr.getName() === 'has') {
                const setName = callExpr.getExpression().getText();
                const replacement = `${varSrc} !== undefined && ${varSrc} !== null && (typeof ${varSrc} !== 'string' || !${setName}.has(${varSrc}))`;
                push(binNode, replacement, `x !== undefined && !SET.has(x) → null+typeof`);
                return;
              }
            }
          }
        }
      }

      // Sol taraf: basit truthy check (identifier veya property access)
      if (!isSimpleAccess(left)) return;

      // ── x && String(x).length OP N ──────────────────────────────────────
      if (Node.isBinaryExpression(right)) {
        const rightRight = (right as BinaryExpression).getRight();
        const rightLeft = (right as BinaryExpression).getLeft();
        const rightOp = (right as BinaryExpression).getOperatorToken().getText().trim();
        if (
          Node.isPropertyAccessExpression(rightLeft) &&
          rightLeft.getName() === 'length'
        ) {
          const lengthObj = rightLeft.getExpression();
          // x.length OP N case
          if (sameVar(left, lengthObj)) {
            const nSrc = rightRight.getText();
            const replacement = `${leftSrc} !== undefined && ${leftSrc} !== null && (typeof ${leftSrc} !== 'string' || ${leftSrc}.length ${rightOp} ${nSrc})`;
            push(binNode, replacement, `x && x.length ${rightOp} ${nSrc} → optional typeof`);
            return;
          }
          // String(x).length OP N case: lengthObj is CallExpression String(x)
          if (
            Node.isCallExpression(lengthObj) &&
            Node.isIdentifier(lengthObj.getExpression()) &&
            lengthObj.getExpression().getText() === 'String' &&
            lengthObj.getArguments().length === 1 &&
            sameVar(left, lengthObj.getArguments()[0])
          ) {
            const nSrc = rightRight.getText();
            const innerFix = `typeof ${leftSrc} !== 'string' || ${leftSrc}.length ${rightOp} ${nSrc}`;
            const replacement = `${leftSrc} !== undefined && ${leftSrc} !== null && (${innerFix})`;
            push(binNode, replacement, `x && String(x).length ${rightOp} ${nSrc} → optional typeof`);
            return;
          }
        }
      }

      // ── x && !SET.has(x) ────────────────────────────────────────────────
      if (
        Node.isPrefixUnaryExpression(right) &&
        right.getOperatorToken() === SyntaxKind.ExclamationToken
      ) {
        const inner = right.getOperand();
        if (
          Node.isCallExpression(inner) &&
          normalizeSource(inner.getText()).endsWith(`.has(${normLeftSrc})`)
        ) {
          const callExpr = inner.getExpression();
          if (Node.isPropertyAccessExpression(callExpr) && callExpr.getName() === 'has') {
            const setName = callExpr.getExpression().getText();
            const replacement = `${leftSrc} !== undefined && ${leftSrc} !== null && (typeof ${leftSrc} !== 'string' || !${setName}.has(${leftSrc}))`;
            push(binNode, replacement, `x && !SET.has(x) → null+typeof`);
            return;
          }
        }
      }

      return;
    }

    // ── Standalone String(x).length OP N ────────────────────────────────────
    // (not inside a && that we already handled above)
    if (
      opToken === '>' || opToken === '>=' ||
      opToken === '<' || opToken === '<=' ||
      opToken === '===' || opToken === '!=='
    ) {
      const left = binNode.getLeft();
      const right = binNode.getRight();

      if (
        Node.isPropertyAccessExpression(left) &&
        left.getName() === 'length'
      ) {
        const lengthObj = left.getExpression();
        if (
          Node.isCallExpression(lengthObj) &&
          Node.isIdentifier(lengthObj.getExpression()) &&
          lengthObj.getExpression().getText() === 'String' &&
          lengthObj.getArguments().length === 1
        ) {
          const arg = lengthObj.getArguments()[0];
          const argSrc = arg.getText();
          const nSrc = right.getText();

          // Eğer parent bir && ise (x !== undefined && String(x).length > N)
          // parent içinde sol taraf x !== undefined AND String'in arg'ı x ise
          const parent = binNode.getParent();
          if (
            parent && Node.isBinaryExpression(parent) &&
            parent.getOperatorToken().getText().trim() === '&&'
          ) {
            const parentLeft = parent.getLeft();
            // x !== undefined && String(x).length > N
            if (
              Node.isBinaryExpression(parentLeft) &&
              parentLeft.getOperatorToken().getText().trim() === '!==' &&
              parentLeft.getRight().getText() === 'undefined' &&
              normalizeSource(parentLeft.getLeft().getText()) === normalizeSource(argSrc)
            ) {
              const varSrc = parentLeft.getLeft().getText();
              const innerFix = `typeof ${varSrc} !== 'string' || ${varSrc}.length ${opToken} ${nSrc}`;
              const replacement = `${varSrc} !== undefined && ${varSrc} !== null && (${innerFix})`;
              push(parent, replacement, `x !== undefined && String(x).length ${opToken} ${nSrc} → optional typeof`);
              return;
            }
          }

          // Standalone
          const innerFix = `typeof ${argSrc} !== 'string' || ${argSrc}.length ${opToken} ${nSrc}`;
          push(binNode, innerFix, `String(${argSrc}).length ${opToken} ${nSrc} → typeof guard`);
        }
      }
    }
  });

  // Tekrar eden / iç içe geçen replacement'ları temizle (büyük olanı önceliklendir)
  const sorted = replacements.sort((a, b) => a.start - b.start);
  const deduped: Replacement[] = [];
  let lastEnd = -1;
  for (const r of sorted) {
    if (r.start >= lastEnd) {
      deduped.push(r);
      lastEnd = r.end;
    }
  }

  return deduped;
}

// ─── Ana işlem ────────────────────────────────────────────────────────────────

const sourceFiles = project.getSourceFiles();
let totalFiles = 0;
let totalChanges = 0;
const changed: Array<{ file: string; changes: string[] }> = [];

for (const sf of sourceFiles) {
  const replacements = collectReplacements(sf);
  if (replacements.length === 0) continue;

  totalFiles++;
  totalChanges += replacements.length;
  const rel = relative(process.cwd(), sf.getFilePath());
  changed.push({ file: rel, changes: replacements.map(r => r.description) });

  if (!isDryRun) {
    // Bottom-up uygula (pozisyon kaymasını önle)
    const sorted = [...replacements].sort((a, b) => b.start - a.start);
    let text = sf.getFullText();
    for (const r of sorted) {
      text = text.slice(0, r.start) + r.text + text.slice(r.end);
    }
    sf.replaceWithText(text);
    sf.saveSync();
  }
}

if (changed.length === 0) {
  console.log('✅ Düzeltilecek anti-pattern bulunamadı.');
} else {
  console.log(`\n${isDryRun ? '🔍 DRY RUN —' : '✅'} ${totalFiles} dosya, ~${totalChanges} değişiklik:\n`);
  for (const { file, changes } of changed) {
    console.log(`  ${file}`);
    if (isVerbose) for (const c of changes) console.log(`    • ${c}`);
  }
  if (isDryRun) console.log('\n  Uygulamak için: npx tsx scripts/codemod-ast.ts');
}
