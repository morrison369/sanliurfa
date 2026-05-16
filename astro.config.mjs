import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import partytown from '@astrojs/partytown';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import compress from 'astro-compress';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.SITE_URL || 'https://sanliurfa.com';
const port = parseInt(process.env.PORT || '4321', 10);

// astro-compress: HTML/CSS/JS/SVG production sıkıştırma. SW dosyaları exclude
// (workbox runtime hash compare bozulur).
const compressionPlugin = compress({
  CSS: true,
  HTML: true,
  JavaScript: true,
  Image: false,
  SVG: true,
  Exclude: [
    (file) => file.includes('service-worker') || file.includes('sw-advanced') || file.includes('sw.js'),
  ],
});

export default defineConfig({
  site,
  output: 'server',
  devToolbar: {
    enabled: process.env.ASTRO_DEV_TOOLBAR !== '0' && process.env.NODE_ENV !== 'test',
  },
  // Astro 6.x built-in CSRF protection — verifies Origin header matches url.origin for form POSTs.
  // allowedDomains: Cloudflare/Apache'nin gönderdiği X-Forwarded-Proto: https header'ına güven;
  // yoksa reverse proxy arkasında url.origin = http:// olur, Origin header = https:// → 403.
  security: {
    checkOrigin: true,
    allowedDomains: [{ hostname: 'sanliurfa.com', protocol: 'https' }],
  },
  env: {
    schema: {
      PORT: envField.number({ context: 'server', access: 'public', default: 4321 }),
      NODE_ENV: envField.enum({
        context: 'server',
        access: 'public',
        values: ['development', 'production', 'test'],
        default: 'development',
      }),
      SITE_URL: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
        default: 'https://sanliurfa.com',
      }),
      PUBLIC_SITE_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
        default: 'https://sanliurfa.com',
      }),
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      JWT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      REDIS_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      STRIPE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      GOOGLE_ANALYTICS_ID: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_GA_MEASUREMENT_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      VAPID_PUBLIC_KEY: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_VAPID_PUBLIC_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      VAPID_PRIVATE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: 'client', access: 'public', optional: true }),

      // Auth & internal
      ADMIN_EMAIL: envField.string({ context: 'server', access: 'public', optional: true, default: 'admin@sanliurfa.com' }),
      INTERNAL_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      BCRYPT_ROUNDS: envField.number({ context: 'server', access: 'public', optional: true, default: 12 }),
      SESSION_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      JWT_REFRESH_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),

      // OAuth (Google + Facebook)
      GOOGLE_CLIENT_ID: envField.string({ context: 'server', access: 'public', optional: true }),
      GOOGLE_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      FACEBOOK_APP_ID: envField.string({ context: 'server', access: 'public', optional: true }),
      FACEBOOK_APP_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Image providers (Pexels free, Unsplash free)
      PEXELS_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      UNSPLASH_ACCESS_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Ollama Cloud AI
      OLLAMA_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      OLLAMA_BASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      OLLAMA_MODEL: envField.string({ context: 'server', access: 'secret', optional: true }),
      OLLAMA_FALLBACK_MODEL: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Email + CORS
      EMAIL_FROM: envField.string({ context: 'server', access: 'public', optional: true }),

      // DB read replica
      READ_REPLICA_URL: envField.string({ context: 'server', access: 'secret', optional: true }),

      // E2E test bypass
      E2E_ADMIN_BYPASS: envField.string({ context: 'server', access: 'public', optional: true }),
      E2E_RATE_LIMIT_BYPASS: envField.string({ context: 'server', access: 'public', optional: true }),

      // Auth & session
      AUTH_REDIS_SESSION_REQUIRED: envField.string({ context: 'server', access: 'public', optional: true }),
      EXPORT_TOKEN_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      METRICS_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      SESSION_TIMEOUT: envField.number({ context: 'server', access: 'public', optional: true, default: 86400 }),

      // DB connection components (DATABASE_URL fallback)
      DB_HOST: envField.string({ context: 'server', access: 'public', optional: true }),
      DB_PORT: envField.number({ context: 'server', access: 'public', optional: true }),
      DB_NAME: envField.string({ context: 'server', access: 'public', optional: true }),
      DB_USER: envField.string({ context: 'server', access: 'public', optional: true }),
      DB_PASSWORD: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Redis connection components (REDIS_URL fallback)
      REDIS_HOST: envField.string({ context: 'server', access: 'public', optional: true }),
      REDIS_PORT: envField.number({ context: 'server', access: 'public', optional: true }),
      REDIS_PASSWORD: envField.string({ context: 'server', access: 'secret', optional: true }),
      REDIS_DB: envField.number({ context: 'server', access: 'public', optional: true }),
      REDIS_KEY_PREFIX: envField.string({ context: 'server', access: 'public', optional: true, default: 'sanliurfa:' }),

      // SMTP connection
      SMTP_HOST: envField.string({ context: 'server', access: 'public', optional: true }),
      SMTP_PORT: envField.number({ context: 'server', access: 'public', optional: true, default: 587 }),
      SMTP_SECURE: envField.string({ context: 'server', access: 'public', optional: true }),
      SMTP_USER: envField.string({ context: 'server', access: 'public', optional: true }),
      SMTP_PASS: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMTP_FROM: envField.string({ context: 'server', access: 'public', optional: true }),
      SMTP_FROM_NAME: envField.string({ context: 'server', access: 'public', optional: true }),
      EMAIL_MOCK: envField.string({ context: 'server', access: 'public', optional: true }),

      // Social / matching features
      SOCIAL_OPEN_ACCESS: envField.string({ context: 'server', access: 'public', optional: true }),
      SOCIAL_TINDER_ENABLED: envField.string({ context: 'server', access: 'public', optional: true }),
      SOCIAL_AUTO_CONVERSATION: envField.string({ context: 'server', access: 'public', optional: true }),
      SOCIAL_SWIPE_DAILY_LIMIT: envField.number({ context: 'server', access: 'public', optional: true, default: 100 }),

      // Rate limiting & ops
      RATE_LIMIT_WINDOW: envField.number({ context: 'server', access: 'public', optional: true }),
      CORS_ORIGINS: envField.string({ context: 'server', access: 'public', optional: true }),
      CLAMAV_ENABLED: envField.string({ context: 'server', access: 'public', optional: true }),
      PHASE1_FREE_MODE: envField.string({ context: 'server', access: 'public', optional: true }),
      PLACE_PENDING_SLA_HOURS: envField.number({ context: 'server', access: 'public', optional: true, default: 72 }),
      GA_TRACKING_ID: envField.string({ context: 'server', access: 'public', optional: true }),

      // Blog webhooks
      BLOG_WEBHOOKS: envField.string({ context: 'server', access: 'public', optional: true }),
      BLOG_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Public app URL (client-side accessible)
      PUBLIC_APP_URL: envField.string({ context: 'client', access: 'public', optional: true }),

      // Stripe additional keys (stripe-config.ts env fallback)
      STRIPE_PUBLISHABLE_KEY: envField.string({ context: 'server', access: 'public', optional: true }),
      STRIPE_WEBHOOK_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),

      // File storage
      UPLOAD_DIR: envField.string({ context: 'server', access: 'public', optional: true }),

      // Push notifications
      VAPID_SUBJECT: envField.string({ context: 'server', access: 'public', optional: true }),

      // Social abuse-policy rate limits
      SOCIAL_RATE_LIMIT_SWIPE: envField.number({ context: 'server', access: 'public', optional: true, default: 120 }),
      SOCIAL_RATE_LIMIT_FOLLOW: envField.number({ context: 'server', access: 'public', optional: true, default: 60 }),
      SOCIAL_RATE_LIMIT_MESSAGE_WRITE: envField.number({ context: 'server', access: 'public', optional: true, default: 80 }),
      SOCIAL_RATE_LIMIT_MESSAGE_READ: envField.number({ context: 'server', access: 'public', optional: true, default: 240 }),
    },
  },
  // Astro core prefetch: daha hizli MPA gecisleri icin tum dahili linklerde prefetch.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  adapter: node({
    mode: 'standalone',
    host: process.env.HOST || '0.0.0.0',
    port,
  }),
  integrations: [
    react(),
    mdx(),
    {
      name: 'sanliurfa-devtools',
      hooks: {
        'astro:config:setup': ({ addDevToolbarApp }) => {
          addDevToolbarApp({
            id: 'sanliurfa-devtools',
            name: 'Şanlıurfa DevTools',
            icon: '🌙',
            entrypoint: new URL('./src/devtools/sanliurfa-toolbar.ts', import.meta.url),
          });
        },
      },
    },
    partytown({
      config: {
        forward: ['dataLayer.push', 'fbq', 'ttq.track'],
      },
    }),
    // astro-icon — Iconify entegrasyonu (200K+ icon).
    // Default collection: lucide (Icon.astro shim'i bare name'leri lucide:* olarak map eder).
    icon({
      iconDir: 'src/icons',
      include: {
        lucide: ['*'],
        heroicons: ['*'],
      },
    }),
    sitemap(),
    compressionPlugin,
  ],
  image: {
    // Remote image optimization için yetkili kaynaklar (Pexels/Unsplash).
    // Astro 6: `domains` deprecated → sadece `remotePatterns` kullan.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
    ],
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  build: {
    inlineStylesheets: 'auto',
    // Split chunks for better caching
    splitVendorChunk: true,
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
      // Tailwind 4 Lightning CSS minify dahili — Vite cssMinify true yapılabilir.
      cssMinify: true,
      // Reduce chunk size
      chunkSizeWarningLimit: 200,
      rollupOptions: {
        external: ['nodemailer'],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/leaflet')) return 'leaflet-vendor';
            if (
              id.includes('/src/data/homepage-shell') ||
              id.includes('/src/data/homepage-theme') ||
              id.includes('/src/lib/admin/preset-summary') ||
              id.includes('/src/lib/admin/preset-storage')
            ) {
              return 'admin-site-content-shared';
            }
            return undefined;
          },
        },
      },
    },
    ssr: {
      noExternal: ['@astrojs/internal-helpers'],
      external: ['nodemailer'],
    },
    // Optimize deps for faster dev/build
    // Sadece installed + actually-imported paketler — yoksa vite warning üretir.
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'date-fns',
        'zod',
      ],
    },
    // Exclude SvelteKit routes
    server: {
      watch: {
        ignored: ['**/src/routes/**'],
      },
    },
  },
});
