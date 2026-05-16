#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function readIfExists(rel) {
  const absolute = path.join(root, rel);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
}

const failures = [];
const layout = read('src/layouts/Layout.astro');
const themeScript = read('src/components/ThemeScript.astro');
const darkToggle = readIfExists('src/components/DarkModeToggle.astro');
const globalCss = read('src/styles/global.css');

if (!layout.includes("import ThemeScript from '../components/ThemeScript.astro'")) {
  failures.push('Layout.astro ThemeScript import etmiyor.');
}

if (!layout.includes('<ThemeScript />')) {
  failures.push('Layout.astro head içinde ThemeScript çalıştırmıyor.');
}

if (!layout.includes('data-theme="light"')) {
  failures.push('html root data-theme="light" ile gelmiyor.');
}

if (/classList\.add\(['"]dark['"]\)/.test(themeScript + darkToggle)) {
  failures.push('Tema kodu dark class ekliyor; light tema tamamlanmadan yasak.');
}

if (/localStorage\.setItem\(['"]theme['"],\s*['"]dark['"]\)/.test(themeScript + darkToggle)) {
  failures.push('Tema kodu theme=dark kaydediyor; canonical light tema bozulur.');
}

if (!/html\.dark[\s\S]*--bg:\s*#FBF6EC/.test(globalCss)) {
  failures.push('global.css html.dark fallback tokenlarını light palete sabitlemiyor.');
}

if (!/color-scheme:\s*light/.test(globalCss)) {
  failures.push('global.css light color-scheme tanımı içermiyor.');
}

if (failures.length > 0) {
  console.error('theme-consistency-gate: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('theme-consistency-gate: PASS');
