import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import partytown from '@astrojs/partytown';

const site = process.env.SITE_URL || 'https://sanliurfa.com';
const port = parseInt(process.env.PORT || '4321', 10);
const compressionPlugins = [];

try {
  const compress = (await import('astro-compress')).default;
  compressionPlugins.push(
    compress({
      CSS: true,
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: true,
      Exclude: [
        (file) => file.includes('service-worker') || file.includes('sw-advanced') || file.includes('sw.js'),
      ],
    })
  );
} catch (error) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[warn] astro-compress plugin not loaded: package not installed');
  }
}

export default defineConfig({
  site,
  output: 'server',
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
    partytown({
      config: {
        forward: ['dataLayer.push', 'fbq', 'ttq.track'],
      },
    }),
...compressionPlugins,
  ],
  image: {
    // Remote image optimization icin yetkili kaynaklar (Pexels/Unsplash).
    domains: ['images.pexels.com', 'images.unsplash.com', 'source.unsplash.com'],
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
    build: {
      cssCodeSplit: true,
      // Temporary: disable css minify until malformed upstream CSS token source is cleaned.
      cssMinify: false,
      // Reduce chunk size
      chunkSizeWarningLimit: 200,
      rollupOptions: {
        external: ['nodemailer'],
      },
    },
    ssr: {
      noExternal: ['@astrojs/internal-helpers'],
      external: ['nodemailer'],
    },
    // Optimize deps for faster dev/build
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'date-fns',
        'lodash-es',
        'zod',
        'react-hook-form',
        '@hookform/resolvers',
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
