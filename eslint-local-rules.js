/**
 * ESLint local plugin — API validation güvenlik kuralları (fixable)
 *
 * Kullanım: eslint.config.mjs'de `import localRules from './eslint-local-rules.js'`
 *
 * Kural: local/no-validation-coercion  (fixable: code)
 *   Tespit edilen anti-pattern'ler (src/pages/api/**):
 *     • String(x).length > N              → typeof x !== 'string' || x.length > N
 *     • x && x.length > N                 → x !== undefined && x !== null && (typeof ...)
 *     • x && !SET.has(x)                  → x !== undefined && x !== null && (typeof ...)
 *     • x !== undefined && !SET.has(x)    → null + typeof guard eklenmeli
 *     • x?.toString?.() assignment        → typeof x === 'string' ? x : null
 *
 *   Auto-fix: `npm run lint:fix`  veya  `npx eslint --fix src/pages/api/**`
 */

export default {
  rules: {
    'no-validation-coercion': {
      meta: {
        type: 'problem',
        fixable: 'code',
        docs: {
          description: "API endpoint string validation anti-pattern'leri tespit eder ve otomatik düzeltir",
          url: 'https://github.com/anthropics/claude-code',
        },
        schema: [],
      },

      create(context) {
        function sc() {
          return context.getSourceCode ? context.getSourceCode() : context.sourceCode;
        }

        return {
          // ── String(x).length OP N ──────────────────────────────────────
          BinaryExpression(node) {
            const { left } = node;
            if (
              left.type !== 'MemberExpression' ||
              left.computed ||
              left.property.name !== 'length' ||
              left.object.type !== 'CallExpression' ||
              left.object.callee.type !== 'Identifier' ||
              left.object.callee.name !== 'String' ||
              left.object.arguments.length !== 1
            ) return;

            const arg = left.object.arguments[0];
            const src = sc().getText(arg);
            const op = node.operator;
            const rightSrc = sc().getText(node.right);
            const innerFix = `typeof ${src} !== 'string' || ${src}.length ${op} ${rightSrc}`;

            context.report({
              node,
              message: `String() coercion: \`String(${src}).length\` yerine \`typeof ${src} !== 'string' || ${src}.length\` kullan`,
              fix(fixer) {
                // x && String(x).length > N  veya  x !== undefined && String(x).length > N
                // → tüm parent LogicalExpression'ı optional typeof pattern'e dönüştür
                const parent = node.parent;
                if (parent && parent.type === 'LogicalExpression' && parent.operator === '&&') {
                  const pl = parent.left;
                  const plSrc = sc().getText(pl);
                  // sol taraf basit identifier ve String() arg ile aynı
                  if (pl.type === 'Identifier' && pl.name === src) {
                    return fixer.replaceText(parent,
                      `${src} !== undefined && ${src} !== null && (${innerFix})`);
                  }
                  // sol taraf x !== undefined && ...
                  if (
                    pl.type === 'BinaryExpression' && pl.operator === '!==' &&
                    pl.right.type === 'Identifier' && pl.right.name === 'undefined' &&
                    sc().getText(pl.left) === src
                  ) {
                    return fixer.replaceText(parent,
                      `${src} !== undefined && ${src} !== null && (${innerFix})`);
                  }
                }
                // Standalone → sadece iç expression'ı düzelt
                return fixer.replaceText(node, innerFix);
              },
            });
          },

          // ── LogicalExpression (&&) ─────────────────────────────────────
          LogicalExpression(node) {
            if (node.operator !== '&&') return;
            const { left, right } = node;

            // ── x !== undefined && !SET.has(x) ──────────────────────────
            if (
              left.type === 'BinaryExpression' && left.operator === '!==' &&
              left.right.type === 'Identifier' && left.right.name === 'undefined' &&
              left.left.type === 'Identifier' &&
              right.type === 'UnaryExpression' && right.operator === '!' &&
              right.argument.type === 'CallExpression' &&
              right.argument.callee.type === 'MemberExpression' &&
              right.argument.callee.property.name === 'has' &&
              right.argument.arguments.length === 1 &&
              right.argument.arguments[0].type === 'Identifier' &&
              right.argument.arguments[0].name === left.left.name
            ) {
              const varName = left.left.name;
              const setName = sc().getText(right.argument.callee.object);
              context.report({
                node,
                message: `ENUM undefined-check: \`${varName} !== undefined && !SET.has(${varName})\` yerine null+typeof guard kullan`,
                fix(fixer) {
                  return fixer.replaceText(node,
                    `${varName} !== undefined && ${varName} !== null && (typeof ${varName} !== 'string' || !${setName}.has(${varName}))`);
                },
              });
              return;
            }

            // Sol taraf basit identifier olmalı (x && ...)
            if (left.type !== 'Identifier') return;
            const leftSrc = left.name;

            // ── x && x.length OP N ──────────────────────────────────────
            if (
              right.type === 'BinaryExpression' &&
              right.left.type === 'MemberExpression' && !right.left.computed &&
              right.left.property.name === 'length' &&
              right.left.object.type === 'Identifier' &&
              right.left.object.name === leftSrc
            ) {
              const op = right.operator;
              const n = sc().getText(right.right);
              context.report({
                node,
                message: `Bare .length: \`${leftSrc} && ${leftSrc}.length\` yerine optional typeof pattern kullan`,
                fix(fixer) {
                  return fixer.replaceText(node,
                    `${leftSrc} !== undefined && ${leftSrc} !== null && (typeof ${leftSrc} !== 'string' || ${leftSrc}.length ${op} ${n})`);
                },
              });
              return;
            }

            // ── x && !SET.has(x) ────────────────────────────────────────
            if (
              right.type === 'UnaryExpression' && right.operator === '!' &&
              right.argument.type === 'CallExpression' &&
              right.argument.callee.type === 'MemberExpression' &&
              right.argument.callee.property.name === 'has' &&
              right.argument.arguments.length === 1 &&
              right.argument.arguments[0].type === 'Identifier' &&
              right.argument.arguments[0].name === leftSrc
            ) {
              const setName = sc().getText(right.argument.callee.object);
              context.report({
                node,
                message: `ENUM falsy check: \`${leftSrc} && !SET.has(${leftSrc})\` yerine null+typeof guard kullan`,
                fix(fixer) {
                  return fixer.replaceText(node,
                    `${leftSrc} !== undefined && ${leftSrc} !== null && (typeof ${leftSrc} !== 'string' || !${setName}.has(${leftSrc}))`);
                },
              });
              return;
            }
          },

          // ── x?.toString?.() assignment ─────────────────────────────────
          VariableDeclarator(node) {
            if (!node.init) return;
            if (
              node.init.type === 'ChainExpression' &&
              node.init.expression.type === 'CallExpression'
            ) {
              const callee = node.init.expression.callee;
              if (
                callee.type === 'MemberExpression' &&
                callee.property.type === 'Identifier' &&
                callee.property.name === 'toString'
              ) {
                // False positive: formData.get() / searchParams.get() / url.searchParams.get()
                // TypeScript types these as string|File|null — .toString?.() is safe
                const obj = callee.object;
                if (
                  obj.type === 'CallExpression' &&
                  obj.callee.type === 'MemberExpression' &&
                  obj.callee.property.type === 'Identifier' &&
                  obj.callee.property.name === 'get'
                ) {
                  return;
                }

                const src = sc().getText(callee.object);
                context.report({
                  node: node.init,
                  message: `toString?.() coercion: \`${src}?.toString?.()\` yerine \`typeof ${src} === 'string' ? ${src} : null\` kullan`,
                  fix(fixer) {
                    return fixer.replaceText(node.init,
                      `typeof ${src} === 'string' ? ${src} : null`);
                  },
                });
              }
            }
          },
        };
      },
    },
  },
};
