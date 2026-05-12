import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const repoRoot = process.cwd();
const read = (file) => fs.readFileSync(path.join(repoRoot, file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const astroConfig = read('astro.config.mjs');
const tsConfig = JSON.parse(read('tsconfig.json'));
const vitestConfig = read('vitest.config.ts');
const vitestSetup = read('vitest.setup.ts');
const eslintConfig = read('eslint.config.mjs');
const envTypes = read('src/env.d.ts');
const middleware = read('src/middleware.ts');
const ecosystem = read('ecosystem.config.cjs');

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function hasPackage(name) {
  return Boolean(packageJson.dependencies?.[name] || packageJson.devDependencies?.[name]);
}

function hasScript(name) {
  return Boolean(packageJson.scripts?.[name]);
}

function sourceIncludes(file, token) {
  return read(file).includes(token);
}

assert(hasPackage('astro'), 'astro dependency eksik');
assert(hasPackage('@astrojs/node'), '@astrojs/node SSR adapter dependency eksik');
assert(hasPackage('@astrojs/react'), '@astrojs/react integration dependency eksik');
assert(hasPackage('@astrojs/mdx'), '@astrojs/mdx integration dependency eksik');
assert(hasPackage('@astrojs/sitemap'), '@astrojs/sitemap dependency eksik');
assert(hasPackage('@astrojs/partytown'), '@astrojs/partytown dependency eksik');
assert(hasPackage('@astrojs/check'), '@astrojs/check dependency eksik');
assert(hasPackage('@tailwindcss/vite'), '@tailwindcss/vite dependency eksik');
assert(hasPackage('sharp'), 'sharp image service dependency eksik');
assert(hasPackage('@axe-core/playwright'), '@axe-core/playwright accessibility dependency eksik');
assert(hasPackage('playwright'), 'playwright browser library dependency eksik');
assert(hasPackage('typescript'), 'typescript dependency eksik');
assert(hasPackage('@typescript-eslint/parser'), '@typescript-eslint/parser dependency eksik');
assert(hasPackage('@typescript-eslint/eslint-plugin'), '@typescript-eslint/eslint-plugin dependency eksik');
assert(hasPackage('eslint-plugin-astro'), 'eslint-plugin-astro dependency eksik');
assert(hasPackage('vitest'), 'vitest dependency eksik');

assert(astroConfig.includes("output: 'server'"), 'Astro SSR output: server eksik');
assert(astroConfig.includes("adapter: node({"), '@astrojs/node adapter config eksik');
assert(astroConfig.includes("mode: 'standalone'"), '@astrojs/node standalone mode eksik');
assert(astroConfig.includes('react()'), '@astrojs/react integration config eksik');
assert(astroConfig.includes('mdx()'), '@astrojs/mdx integration config eksik');
assert(astroConfig.includes('partytown('), '@astrojs/partytown integration config eksik');
assert(astroConfig.includes('sitemap()'), '@astrojs/sitemap integration config eksik');
assert(astroConfig.includes('icon({'), 'astro-icon integration config eksik');
assert(astroConfig.includes('tailwindcss()'), '@tailwindcss/vite plugin config eksik');
assert(astroConfig.includes("entrypoint: 'astro/assets/services/sharp'"), 'Astro sharp image service config eksik');
assert(astroConfig.includes('devToolbar:'), 'Astro devToolbar kontrolü eksik');
assert(ecosystem.includes("name: 'sanliurfa-app'"), 'PM2 ecosystem process adı sanliurfa-app değil');
assert(ecosystem.includes("script: './dist/server/entry.mjs'"), 'PM2 ecosystem Astro SSR entrypoint kullanmıyor');
assert(ecosystem.includes("HOST: '127.0.0.1'"), 'PM2 ecosystem HOST 127.0.0.1 değil');
assert(ecosystem.includes('PORT: 4321'), 'PM2 ecosystem PORT 4321 değil');
assert(ecosystem.includes("exec_mode: 'fork'"), 'PM2 ecosystem CWP için fork mode değil');
assert(ecosystem.includes('kill_timeout: 10000'), 'PM2 ecosystem graceful kill_timeout 10000 değil');
assert(tsConfig.extends === 'astro/tsconfigs/strict', 'tsconfig astro/tsconfigs/strict extend etmiyor');
assert(tsConfig.compilerOptions?.strict === true, 'TypeScript strict true değil');
assert(tsConfig.compilerOptions?.noImplicitAny === true, 'TypeScript noImplicitAny true değil');
assert(tsConfig.compilerOptions?.strictNullChecks === true, 'TypeScript strictNullChecks true değil');
assert(tsConfig.compilerOptions?.isolatedModules === true, 'TypeScript isolatedModules true değil');
assert(tsConfig.compilerOptions?.verbatimModuleSyntax === true, 'TypeScript verbatimModuleSyntax true değil');
assert(tsConfig.compilerOptions?.paths?.['@/*']?.includes('src/*'), 'TypeScript @/* path alias eksik');
assert(envTypes.includes('astro/client'), 'src/env.d.ts astro/client referansı eksik');
assert(envTypes.includes('interface ImportMetaEnv'), 'src/env.d.ts ImportMetaEnv tanımı eksik');
assert(vitestConfig.includes('getViteConfig'), 'Vitest Astro getViteConfig ile bağlı değil');
assert(vitestConfig.includes("environment: 'node'"), 'Vitest node environment eksik');
assert(vitestConfig.includes("setupFiles: ['./vitest.setup.ts']"), 'Vitest setupFiles eksik');
assert(vitestSetup.includes("process.env.SITE_URL = 'https://sanliurfa.com'"), 'Vitest SITE_URL canonical helper setup eksik');
assert(vitestSetup.includes("process.env.PUBLIC_APP_URL = 'https://sanliurfa.com'"), 'Vitest PUBLIC_APP_URL canonical helper setup eksik');
assert(eslintConfig.includes('astro-eslint-parser'), 'ESLint astro-eslint-parser eksik');
assert(eslintConfig.includes('eslint-plugin-astro'), 'ESLint astro plugin eksik');
assert(eslintConfig.includes('@typescript-eslint/parser'), 'ESLint TypeScript parser eksik');

assert(hasScript('type-check') && packageJson.scripts['type-check'].includes('astro check'), 'type-check astro check kullanmıyor');
assert(hasScript('build') && packageJson.scripts.build.includes('astro build'), 'build astro build kullanmıyor');
assert(hasScript('lint') && packageJson.scripts.lint.includes('eslint'), 'lint eslint kullanmıyor');
assert(hasScript('test:unit') && packageJson.scripts['test:unit'].includes('vitest'), 'test:unit vitest kullanmıyor');
assert(hasScript('test:e2e:astro'), 'Astro özel E2E script eksik');
assert(hasScript('test:e2e:astro:dev'), 'Astro dev E2E script eksik');
assert(hasScript('test:e2e:astro:preview'), 'Astro SSR preview E2E script eksik');
assert(hasScript('test:e2e:astro:prod'), 'Prod URL E2E script eksik');

assert(sourceIncludes('scripts/e2e/astro-homepage-a11y.mjs', 'AxeBuilder'), 'E2E axe builder entegrasyonu eksik');
assert(sourceIncludes('scripts/e2e/astro-homepage-a11y.mjs', 'desktop'), 'E2E desktop viewport eksik');
assert(sourceIncludes('scripts/e2e/astro-homepage-a11y.mjs', 'tablet'), 'E2E tablet viewport eksik');
assert(sourceIncludes('scripts/e2e/astro-homepage-a11y.mjs', 'mobile'), 'E2E mobile viewport eksik');
assert(sourceIncludes('src/pages/index.astro', 'application/ld+json'), 'Ana sayfa JSON-LD eksik');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', 'Şanlıurfa’yı Keşfetmenin En Kolay Yolu'), 'Yeni landing H1 eksik');

const requiredArchitectureFiles = [
  'src/components/templates/LandingTemplate.astro',
  'src/components/Header.astro',
  'src/components/Footer.astro',
  'src/components/Image.astro',
  'src/components/Icon.astro',
  'src/components/SEO.astro',
  'src/components/home/CityGuideLanding.astro',
  'src/lib/utils.ts',
  'src/lib/seo-utils.ts',
  'src/lib/seo-helpers.ts',
  'src/lib/seo-image.ts',
  'src/lib/public-app-url.ts',
  'src/lib/public-image-resolvers.ts',
  'src/lib/content-images.ts',
  'src/lib/home-presentation.ts',
  'src/lib/homepage-media.ts',
  'src/data/city-taxonomy.ts',
  'src/components/public/CategoryHub.astro',
  'src/styles/global.css',
  'ecosystem.config.cjs',
  'scripts/ci/public-city-structure-gate.mjs',
];
for (const file of requiredArchitectureFiles) {
  assert(fs.existsSync(path.join(repoRoot, file)), `zorunlu mimari dosya eksik: ${file}`);
}

assert(sourceIncludes('src/components/home/CityGuideLanding.astro', '../Image.astro'), 'Landing Astro Image component kullanmıyor');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', '../Icon.astro'), 'Landing Icon component kullanmıyor');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', 'getSiteSetting'), 'Landing admin/site-content fallback kullanmıyor');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', 'getPrimaryCityTaxonomyCategories'), 'Landing merkezi taxonomy kullanmıyor');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', 'form action="/arama"'), 'Landing arama formu /arama kanoniğine bağlı değil');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', '/images/places/balikligol.jpg'), 'Landing Balıklıgöl için gerçek mekan görselini kullanmıyor');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', '/images/places/gobeklitepe.jpg'), 'Landing Göbeklitepe için gerçek mekan görselini kullanmıyor');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', '/images/tarihi-yerler/harran-kumbet-evleri.jpg'), 'Landing Harran için gerçek kümbet evleri görselini kullanmıyor');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', 'Şanlıurfa Topluluğu ve Eşleşme'), 'Landing sosyal eşleşme modülünü göstermiyor');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', "'/eslesme'"), 'Landing /eslesme iç linki eksik');
assert(sourceIncludes('src/components/home/CityGuideLanding.astro', "'/topluluk'"), 'Landing /topluluk iç linki eksik');
assert(sourceIncludes('src/components/Header.astro', 'sf-main-nav'), 'Header ana nav sınıf/sözleşmesi eksik');
assert(sourceIncludes('src/components/Header.astro', 'mobileMenuBtn'), 'Header mobil menü test id/sözleşmesi eksik');
assert(sourceIncludes('src/components/Header.astro', '/eslesme'), 'Header eşleşme bağlantısı eksik');
assert(sourceIncludes('src/components/Header.astro', '/topluluk'), 'Header topluluk bağlantısı eksik');
assert(sourceIncludes('src/components/Footer.astro', 'Sosyal medya'), 'Footer sosyal medya alanı eksik');
assert(sourceIncludes('src/components/Footer.astro', '/eslesme'), 'Footer eşleşme bağlantısı eksik');
assert(sourceIncludes('src/pages/ara.astro', "Astro.redirect(`${target.pathname}${target.search}`, 301)"), '/ara kanonik /arama redirect kullanmıyor');
assert(sourceIncludes('src/components/SearchResults.tsx', 'bg-white'), 'SearchResults light public tema kullanmıyor');
assert(!sourceIncludes('src/components/SearchResults.tsx', 'text-[#EDE0C6]'), 'SearchResults eski koyu tema metin rengi içeriyor');
assert(sourceIncludes('src/pages/eslesme.astro', 'SwipeMatchExperience'), '/eslesme swipe deneyimini korumuyor');
assert(sourceIncludes('src/pages/topluluk.astro', 'SocialFeatures'), '/topluluk sosyal özellikleri korumuyor');
assert(sourceIncludes('src/data/city-taxonomy.ts', 'CITY_TAXONOMY_CATEGORIES'), 'city taxonomy registry eksik');
assert(sourceIncludes('src/components/public/CategoryHub.astro', 'Hızlı Cevap'), 'CategoryHub hızlı cevap bloğu eksik');
assert(sourceIncludes('src/components/Image.astro', 'astro:assets'), 'Image component Astro asset pipeline kullanmıyor');
assert(sourceIncludes('src/components/Icon.astro', 'astro-icon'), 'Icon component astro-icon kullanmıyor');
assert(sourceIncludes('src/components/SEO.astro', 'resolveSeoOgImage'), 'SEO component route-aware OG image resolver kullanmıyor');
assert(sourceIncludes('src/lib/seo-image.ts', '/images/places/balikligol.jpg'), 'SEO image resolver şehir görsel fallback kullanmıyor');
assert(sourceIncludes('src/lib/seo-image.ts', '/images/foods/homepage/urfa-kebabi-card.png'), 'SEO image resolver yemek görsel fallback kullanmıyor');
assert(middleware.includes('https://fonts.googleapis.com') && middleware.includes('https://fonts.gstatic.com'), 'CSP Google Fonts kaynaklarını kapsamıyor');

const forbiddenTerms = ['Ürün, marka', 'iPhone', 'Samsung', 'Laptop', 'Kulaklık'];
const publicSurfaceFiles = [
  'src/pages/index.astro',
  'src/components/Header.astro',
  'src/components/Footer.astro',
  'src/components/home/CityGuideLanding.astro',
];
for (const file of publicSurfaceFiles) {
  const source = read(file);
  for (const term of forbiddenTerms) {
    assert(!source.includes(term), `${file} içinde şehir rehberine aykırı kalıntı var: ${term}`);
  }
}

const landingSource = read('src/components/home/CityGuideLanding.astro');
assert(!landingSource.includes('/images/blog/balikligol.jpg'), 'Landing alakasız Balıklıgöl blog görselini kullanıyor');

try {
  const executablePath = chromium.executablePath();
  assert(fs.existsSync(executablePath), `Chromium binary bulunamadı: ${executablePath}`);
} catch (error) {
  failures.push(`Chromium binary doğrulanamadı: ${error.message}`);
}

if (failures.length > 0) {
  console.error('astro-stack-audit-gate: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('astro-stack-audit-gate: PASS');
