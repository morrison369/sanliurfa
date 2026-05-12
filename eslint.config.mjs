// ESLint Flat Config — migrated from .eslintrc.cjs (2026-04-26)
// ESLint v9+ requires flat config; legacy .eslintrc.* deprecated.
//
// Equivalent to old config:
// - parser: @typescript-eslint/parser
// - plugins: @typescript-eslint, astro
// - extends: eslint:recommended, plugin:@typescript-eslint/recommended, plugin:astro/recommended
// - All "off" rules preserved (project-specific noise reduction)

import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import astroPlugin from 'eslint-plugin-astro';
import astroParser from 'astro-eslint-parser';
import localRules from './eslint-local-rules.js';

const projectIgnores = [
  'dist/**',
  'node_modules/**',
  '.astro/**',
  'public/**',
  'src/pages/admin/component-gallery.astro',
  // astro-eslint-parser fails to parse <style is:inline> blocks as CSS
  // (treats CSS { } as JSX expressions → "must have one parent element" parse error).
  // Security rules are enforced by security-*.test.ts static lock tests.
  'src/pages/giris.astro',
];

const offRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/ban-ts-comment': 'off',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  'no-case-declarations': 'off',
  'no-undef': 'off',
  'prefer-const': 'off',
  'no-empty-pattern': 'off',
  'no-extra-semi': 'off',
  'no-self-assign': 'off',
  'no-useless-escape': 'off',
  'prefer-rest-params': 'off',
  'no-constant-condition': 'off',
  'no-prototype-builtins': 'off',
  'no-dupe-else-if': 'off',
  'no-useless-catch': 'off',
  '@typescript-eslint/no-var-requires': 'off',
  '@typescript-eslint/no-require-imports': 'off',
  '@typescript-eslint/no-unsafe-declaration-merging': 'off',
  '@typescript-eslint/no-namespace': 'off',
  '@typescript-eslint/no-empty-object-type': 'off',
  '@typescript-eslint/no-wrapper-object-types': 'off',
  '@typescript-eslint/no-unsafe-function-type': 'off',
  '@typescript-eslint/no-this-alias': 'off',
  '@typescript-eslint/no-unused-expressions': 'off',
  'no-empty': 'off',
  'no-cond-assign': 'off',
  'no-fallthrough': 'off',
  'no-async-promise-executor': 'off',
  'no-control-regex': 'off',
  'no-unsafe-finally': 'off',
  'no-misleading-character-class': 'off',
  'no-irregular-whitespace': 'off',
  'no-import-assign': 'off',
  'no-sparse-arrays': 'off',
  'no-loss-of-precision': 'off',
  'no-useless-backreference': 'off',
  'no-self-compare': 'off',
  'no-unexpected-multiline': 'off',
  // ESLint v9+ new recommended rules — opt out (project-wide noise)
  'no-useless-assignment': 'off',
  'no-redeclare': 'off',
};

export default [
  { ignores: projectIgnores },

  // Base JavaScript recommended
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Browser
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        // Node
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...offRules,
    },
  },

  // API endpoint validation anti-pattern detection
  {
    files: ['src/pages/api/**/*.ts'],
    plugins: { local: localRules },
    rules: {
      'local/no-validation-coercion': 'error',
    },
  },

  // Astro files
  ...astroPlugin.configs['flat/recommended'],
  {
    files: ['**/*.astro'],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.astro'],
      },
    },
    rules: offRules,
  },
];
