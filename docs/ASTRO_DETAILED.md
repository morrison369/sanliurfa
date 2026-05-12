# Astro 6.x Detaylı Referans

Bu dosya CLAUDE.md'den ayrılmıştır. Astro framework pattern'leri, direktifler, gelişmiş özellikler ve SEO mimarisi.

## Astro Framework Patterns

### SSR Mode
This project runs in `output: 'server'` — all pages render on-demand. Key implications:
- `getStaticPaths()` is **ignored** — use `Astro.params` + DB queries instead
- Always guard with `Astro.redirect()` on missing/unauthorized resources
- `Astro.locals` is request-scoped and reset per request

```astro
---
// SSR dynamic route — params come from URL, not getStaticPaths
const { slug } = Astro.params;
const place = await queryOne('SELECT * FROM places WHERE slug = $1', [slug]);
if (!place) return Astro.redirect('/404');
---
```

### API Routes (Endpoints)
All endpoints live in `src/pages/api/` and export named HTTP method handlers:

```typescript
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals, params, cookies, url }) => {
  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const body = await request.json();
  // ...
};
```

- Always use `apiResponse()` / `apiError()` from `src/lib/api.ts` — they add `X-Request-ID` and consistent shape
- `locals.user` is set by middleware from `auth-token` cookie — never trust client-supplied user IDs

### Middleware & locals
Middleware is in `src/middleware.ts`. The `App.Locals` interface is declared in `src/env.d.ts`:

```typescript
// src/env.d.ts
declare namespace App {
  interface Locals {
    user?: { id: string; email: string; role: string; fullName?: string };
    isAdmin?: boolean;
    requestId?: string;
  }
}
```

Access in pages via `Astro.locals`, in endpoints via `context.locals`. Never reassign the entire `locals` object — mutate its properties.

### React Islands (Client Hydration)
```astro
<Counter client:load />    <!-- Hydrate immediately -->
<Map client:idle />        <!-- Hydrate when browser idle -->
<Gallery client:visible /> <!-- Hydrate when scrolled into view -->
<Modal client:only="react" /> <!-- Client-only, no SSR -->
```

React props must be serializable — no `Date` objects, functions, or Maps. Pass ISO strings for dates.

### Cookies (Auth)
```typescript
// Set in API route
context.cookies.set('auth-token', token, {
  httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 86400
});

// Read in middleware
const token = context.cookies.get('auth-token')?.value;
```

### File-Based Routing Summary
```
src/pages/index.astro           → /
src/pages/mekan/[slug].astro    → /mekan/:slug  (SSR: use Astro.params.slug)
src/pages/api/places/[id].ts    → /api/places/:id
src/pages/_helpers/util.ts      → NOT a route (underscore prefix)
```

### Environment Variables
- `PUBLIC_*` vars are exposed to the browser (baked in at build time)
- Non-PUBLIC vars are server-only
- Access via `import.meta.env.VAR_NAME`

### Error Pages
- `src/pages/404.astro` — rendered when no route matches
- `src/pages/500.astro` — rendered for unhandled server errors

---


## SEO & Structured Data Architecture

### Bileşenler
- **`src/components/SEO.astro`** — Tüm meta tag'leri (`<title>`, OG, Twitter Card, robots), hepsinin `<head>`'e Layout.astro üzerinden eklenmesi yeterli. Favicon/manifest/viewport bu dosyada YOKTUR (Layout.astro'dadır).
- **JSON-LD inline pattern** — Sayfalarda doğrudan `<script type="application/ld+json" set:html={JSON.stringify({...})} is:inline />` ile eklenir. Wrapper bileşen yoktur (eski `SchemaOrg.astro` 2026-04-25 temizlikte silindi — hiç import edilmiyordu).
- **`src/lib/seo-helpers.ts`** — `generateCanonicalUrl`, `generateOGTags`, `generateSchemaOrg` yardımcı fonksiyonlar. `SITE` constant'ına bağımlı.
- **`src/components/Image.astro`** — Astro native `<Picture>` wrapper (avif/webp, lazy load). Yetkili remote host'lar: `images.pexels.com`, `images.unsplash.com`. Tüm yerel ve izinli remote görseller için kullan.

### AI & GEO Görünürlüğü
- **`public/llms.txt`** — AI crawler'lar (Claude, GPT, Perplexity) için yapılandırılmış site haritası. Site içeriği ve bölümleri açıklar.
- **`public/robots.txt`** — Tüm büyük AI botlara (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Amazonbot`) izin verilmiş.
- Yeni sayfa/bölüm eklenince `llms.txt`'i güncelle.

### Astro 6.1 Aktif Entegrasyonlar (astro.config.mjs)
- `@astrojs/react` — React 19 islands (`client:load`, `client:idle`, `client:visible`)
- `@astrojs/mdx` — MDX blog desteği
- `@astrojs/partytown` — GA ve 3. taraf scriptleri web worker'a taşır
- `@astrojs/node` — Standalone SSR adapter (PM2 ile production)
- `astro-compress` — Prod build'da HTML/CSS/JS/SVG sıkıştırma
- **TailwindCSS 4.2 + `@tailwindcss/vite`** — modern Vite plugin yolu (PostCSS pipeline yok, `postcss.config.js` silindi, `tailwind.config.js` silindi). `astro.config.mjs` `vite.plugins`'e `tailwindcss()` ile bağlı. `src/styles/global.css` Tailwind 4 syntax: `@import "tailwindcss"` + `@plugin "@tailwindcss/typography"` + `@plugin "@tailwindcss/forms"` + `@source` + `@variant dark` + `@theme { --color-urfa-... }`. Responsive utility'ler (md:hidden, lg:grid-cols-3) artık doğru generate ediliyor — önceki PostCSS-tabanlı 3 retry'da fail eden problem çözüldü. **HARD CONSTRAINT**: Tailwind 4 `@apply custom-class` (örn. `@apply btn`) desteklenmiyor — her variant'ta base utility'leri inline expand et (örnek `global.css:.btn-primary`). **Container Queries**: Tailwind 4 native `@container` + `@sm:`, `@md:`, `@lg:` variants destekliyor. Component-level responsive (parent container size'a göre, viewport'tan bağımsız) için `@container` class + `@md:grid-cols-2` gibi kullan. Sample component: `src/components/examples/ContainerQueryCard.astro` (parent `@container` + children `@md:flex-row` + `@lg:line-clamp-3`). Mevcut viewport-based layout'lar (md:, lg:) korundu, yeni card/widget komponent'leri için container query tercih edilir.
- **astro-icon (Iconify)** — `@iconify-json/lucide` + `@iconify-json/heroicons` collection'ları, 200K+ icon. `src/components/Icon.astro` backward-compat shim: legacy `<Icon name="home" />` → otomatik `lucide:home`. Modern usage: `<Icon name="heroicons:bell" />`. Build-time tree-shake — sadece kullanılan icon'lar bundle'a girer.
- **`@astrojs/sitemap` paket olarak kaldırıldı** (2026-04-26) — SSR mode'da dynamic route'ları keşfedemez. Sitemap `src/pages/sitemap.xml.ts` custom SSR endpoint ile sağlanır (DB-populated). Yeniden eklenmemeli.

### Astro 6.1 Kullanılan Native Özellikler
- **`<ClientRouter fallback="animate">`** (`astro:transitions`) — Layout.astro'da `<head>`'de. SPA-benzeri sayfa geçişleri, Astro prefetch ile entegre çalışır. Import: `import { ClientRouter } from 'astro:transitions'`
- **Env naming convention**: feature kapatma flag'leri `*_DISABLED=1` pattern'ini izler (örn. `BACKUP_SCHEDULER_DISABLED`). Default-enabled feature'lar için bu daha güvenli — env unset olduğunda feature aktif kalır (positive default). Yeni env eklerken: secret olanlar `access: 'secret'`, browser-exposed olanlar `PUBLIC_` prefix + `context: 'client', access: 'public'`. Number type için `envField.number({...})`, optional varsayılan + `default: N`.
- **`astro:env` / `envField`** — astro.config.mjs'de type-safe env schema. `import.meta.env.VAR` yerine bu kullanılır. ~50+ envField tanımlı (PORT, NODE_ENV, SITE_URL, PUBLIC_*, DATABASE_URL, JWT_SECRET, REDIS_URL, RESEND_API_KEY, STRIPE_SECRET_KEY, GA, VAPID, Supabase, ADMIN_EMAIL, INTERNAL_API_TOKEN, BCRYPT_ROUNDS, JWT_REFRESH_SECRET, GOOGLE_CLIENT_ID/SECRET, FACEBOOK_APP_ID/SECRET, PEXELS_API_KEY, UNSPLASH_ACCESS_KEY, EMAIL_FROM, ALLOWED_ORIGINS, READ_REPLICA_URL, E2E_ADMIN_BYPASS, DB_*, REDIS_*, SMTP_*, BLOG_WEBHOOK_*, vb.).
- **`prefetch: { prefetchAll: true, defaultStrategy: 'hover' }`** — Tüm dahili linkler hover'da prefetch edilir.
- **Content Layer API** (`src/content.config.ts`) — `glob` loader ile `src/content/` koleksiyonları tanımlar.
- **`Astro.site`** — `astro.config.mjs`'deki `site` değeri; `new URL(Astro.url.pathname, Astro.site)` ile canonical URL üretilebilir (SEO.astro bunu `Astro.url.pathname` fallback ile otomatik yapar).

### Canonical URL Davranışı
`SEO.astro` line 40: canonical, verilmezse `Astro.url.pathname` (query string YOK) ile otomatik oluşturulur. SSR mode'da `pathname` query parametresiz doğru canonical üretir. Sayfa seo objesine `canonical` eklemek opsiyonel — sadece alias/redirect durumlarında gereklidir.

### Sitemap
- **Endpoint**: `src/pages/sitemap.xml.ts` → `/sitemap.xml` (DB-populated, SSR)
- **Layout referansı**: `<link rel="sitemap" href="/sitemap.xml" />`
- `/sitemap-index.xml` yok — `@astrojs/sitemap` paketi kaldırıldı (2026-04-26 cleanup; SSR mode dynamic route discovery yok).

### Dikkat Edilecekler
- JSON-LD'yi inline `<script type="application/ld+json" set:html={JSON.stringify(...)} is:inline />` ile ekle
- `<Image src="..." alt="..." />` — `src/components/Image.astro`'yu import et, ham `<img>` kullanma
- `transition:persist` direktifi ile navigasyon boyunca korunması gereken elementleri işaretle (örn. header, müzik player)

### Astro Actions (`src/actions/index.ts`)
Form işlemleri için `astro:actions` kullanılır — REST API endpoint'e ihtiyaç yoktur:
```astro
const result = Astro.getActionResult(actions.submitContactRequest);
```
Mevcut action'lar: `login`, `register`, `submitContactRequest`, `submitPlaceReview`, `submitPlaceApplication`, `requestPasswordReset`, `resetPassword`, `subscribeBlogNewsletter`, `updateProfileSettings`, `changeAccountPassword`, admin event/tarihi yer CRUD.

### Önemli env Değişkenleri
- `ADMIN_EMAIL` — İletişim formu bildirim e-postası (default: `admin@sanliurfa.com`)
- `RESEND_API_KEY` veya admin paneli `integrations.email` — e-posta gönderimi
- `GA_TRACKING_ID` veya admin paneli `integrations.analytics.ga_id` — Google Analytics

---

## Astro 6.x Direktifler ve Namespace'ler — Tam Referans

### astro:* Modülleri (6.x'te Aktif)

| Modül | Durum | Kullanım |
|---|---|---|
| `astro:actions` | ✅ Aktif | Form action'ları, type-safe server mutations |
| `astro:assets` | ✅ Aktif | `<Image>`, `<Picture>` — sharp ile optimize |
| `astro:content` | ✅ Aktif | Content collections (glob loader) |
| `astro:env` | ✅ Aktif | Type-safe env schema (astro.config.mjs'de tanımlı) |
| `astro:middleware` | ✅ Aktif | `defineMiddleware`, `sequence` |
| `astro:transitions` | ✅ Aktif | `<ClientRouter fallback="animate" />` |
| `astro:toolbar` | ✅ Aktif | `defineToolbarApp` — DevToolbar plugin'leri |
| `astro:db` | ⚠️ Unused | Astro Studio DB — proje PostgreSQL kullanıyor, kullanılmıyor |
| `astro:i18n` | ⚠️ Unused | i18n routing — proje Türkçe-only, kullanılmıyor |
| `astro:ssr-manifest` | ❌ Kaldırıldı | Astro 6.0'da deprecated/removed |

**Not:** `<ViewTransitions />` → Astro 6.x'te `<ClientRouter />` olarak yeniden adlandırıldı. Proje zaten `ClientRouter` kullanıyor.

### Template Direktifleri

```astro
<!-- class:list — koşullu class birleştirme -->
<div class:list={['base', { active: isActive, hidden: !show }]} />

<!-- set:html — güvenilir HTML içerik (XSS riski: yalnızca server-side verified data) -->
<script set:html={JSON.stringify(schema)} is:inline />

<!-- set:text — XSS-safe text injection -->
<span set:text={userInput} />

<!-- define:vars — server değerlerini inline script'e aktar -->
<script define:vars={{ placeId, mapConfig }} is:inline>
  console.log(placeId); // server değeri client script'te kullanılabilir
</script>

<!-- is:inline — Astro'nun script optimizasyonunu devre dışı bırak -->
<script is:inline>window.onload = () => {}</script>

<!-- is:global — style tag'ini global yap (scoped değil) -->
<style is:global>.leaflet-map { ... }</style>
```

### Client Direktifleri (React Islands)

```astro
<Component client:load />    <!-- Hemen hydrate et — kritik etkileşimler -->
<Component client:idle />    <!-- Tarayıcı boşta iken hydrate et -->
<Component client:visible /> <!-- Viewport'a girince hydrate et (lazy) -->
<Component client:media="(max-width: 768px)" /> <!-- Media query eşleşince -->
<Component client:only="react" /> <!-- Sadece client'ta render, SSR yok -->
```

### Server Direktifleri (Server Islands — Astro 5.10+/6.x stabil)

```astro
<!-- server:defer — yavaş DB sorgusu yapan .astro bileşenlerini ertele -->
<DashboardStats server:defer>
  <div slot="fallback" class="animate-pulse h-24 bg-gray-100 rounded" />
</DashboardStats>
```

`server:defer` yalnızca `.astro` bileşenlerine uygulanır. React (`client:visible`) farklı mekanizmadır.
Proje'de uygulanan örnek: `src/components/admin/DashboardStats.astro` + `src/pages/admin/dashboard.astro`

### Transition Direktifleri (View Transitions)

```astro
<!-- transition:persist — navigasyonlar arası element koru -->
<Header transition:persist="site-header" />
<Toast transition:persist="toast-container" />

<!-- transition:name — element eşleştirme için benzersiz isim -->
<img transition:name={`place-image-${id}`} />

<!-- transition:animate — geçiş animasyonu özelleştir -->
<div transition:animate="slide" />
```

### Astro 6.x Yeni Özellikler (5.x'ten Farklı)
- **`security.checkOrigin: true`** — Astro.config.mjs'de etkin, form POST CSRF koruması sağlar
- **Node 22+** zorunlu (proje node >=20 diyor ama 22+ önerilen)
- **Vite 7** altında çalışır
- **Content Layer API** — build-time yerine runtime collection desteği (`astro:content`)

### @astrojs Ekosistemi — Yüklü Paketler

```
@astrojs/react      — React 19 Islands
@astrojs/mdx        — MDX blog desteği
@astrojs/partytown  — GA/3rd-party scripts web worker'a
@astrojs/node       — Standalone SSR adapter (PM2 ile prod)
                    — @astrojs/sitemap kaldırıldı (custom sitemap.xml.ts SSR endpoint'i kullanılıyor)
@astrojs/check      — astro check (TS doğrulama)
@tailwindcss/vite   — Tailwind 4 Vite plugin (PostCSS yok)
astro-icon          — Iconify (Lucide + Heroicons), 200K+ icon
```

`@astrojs/sitemap` paketi kaldırıldı (2026-04-26) çünkü SSR mode'da dynamic route'ları keşfedemez. Sitemap `src/pages/sitemap.xml.ts` custom SSR endpoint ile DB-driven olarak sağlanır.

---

## Astro 6.x Gelişmiş Özellikler

### Container API — SSR Bileşen Testleri (4.9+)
Astro `.astro` bileşenlerini HTTP sunucusu başlatmadan Vitest içinde render etmek için Container API kullanılır.

```typescript
// src/lib/__tests__/helpers/astro-container.ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
const container = await AstroContainer.create();
const response = await container.renderToResponse(MyPage, {
  props: { slug: 'test' },
  request: new Request('http://localhost/mekan/test'),
  locals: { user: { id: '1', role: 'admin' } },
});
expect(response.status).toBe(200);
```

Helper wrapper'lar `src/lib/__tests__/helpers/astro-container.ts`'de:
- `renderAstroComponent(Component, options)` → HTML string döner
- `renderAstroToResponse(Component, options)` → Response döner (status code testleri için)

DB ve Redis her zaman `vi.mock()` ile mock'lanmalıdır — Container API gerçek sunucu ortamında çalışır.

### Server Islands — Yavaş Bileşenleri Erteleme (5.0+)
`server:defer` direktifi ile `.astro` bileşenleri ilk HTML yanıtından sonra asenkron render edilir. **Sadece `.astro` bileşenlerine uygulanır**, React Islands (`client:visible`) değil.

```astro
---
// HeavyStats.astro — yavaş DB sorgusu içeriyor
const stats = await getExpensiveStats();
---
<div>{stats.total}</div>
```

```astro
<!-- admin/dashboard.astro -->
<HeavyStats server:defer>
  <div slot="fallback" class="animate-pulse bg-gray-200 h-10 rounded" />
</HeavyStats>
```

Mevcut React bileşenleri (`AdminAnalyticsDashboard client:visible`) zaten lazy hydration yapıyor — bu yaklaşım `server:defer`'dan farklıdır ve değiştirilmemeli.

**Aktif Server Islands (production'da çalışan):**
- `src/components/admin/DashboardStats.astro` — admin/dashboard ağır istatistikler
- `src/components/places/RelatedPlaces.astro` — `/isletme/[slug]` "Benzer Mekanlar"
- `src/components/recipes/RelatedRecipes.astro` — `/yemek-tarifleri/[slug]` "Diğer Tarifler"
- `src/components/events/RelatedEvents.astro` — `/etkinlikler/[slug]` "Benzer Etkinlikler"
- `src/components/blog/RelatedPosts.astro` — `/blog/[slug]` "Benzer Yazılar"

**Pattern:** Detail sayfalarındaki "secondary widget" (ana içerikten ayrı, blocking olmamalı) Server Islands'a alınır. Pattern: ayrı `.astro` bileşeni → `server:defer` çağırma + `<div slot="fallback">` skeleton. SSR sequential query'leri paralel hale getirir, TTFB ~150-300ms düşürür.

### DevToolbar Plugin (Custom)
Dev ortamında toolbar'a Şanlıurfa DevTools paneli eklendi (`src/devtools/sanliurfa-toolbar.ts`). Plugin `astro.config.mjs`'deki `addDevToolbarApp()` hook'uyla kayıtlıdır. Production build'a dahil **edilmez**.

Toolbar panelinde: framework bilgileri, env değerleri, admin quick link'leri.

### astro:env Schema (6.x)
`astro.config.mjs`'deki `env.schema` bloğu type-safe env validasyonu sağlar:
```typescript
import { envField } from 'astro/config';
DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true })
```
Yeni env var eklendiğinde önce `astro.config.mjs env.schema`'ya ekle, sonra kullan.

---
