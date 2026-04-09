import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';

const site = process.env.SITE_URL || 'https://sanliurfa.com';

export default defineConfig({
  site,
  output: 'server',
  adapter: node({
    mode: 'standalone',
    port: 6000,
  }),
  integrations: [
    tailwind(),
    react(),
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/profil') && !page.includes('/api'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
    compress({
      CSS: true,
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: true,
      Exclude: ['.*service-worker\\.js$', '.*sw\\.js$'],
    }),
  ],
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.message?.includes('Generated an empty chunk')) return;
          if (warning.message?.includes('@astrojs/internal-helpers/remote')) return;
          warn(warning);
        },
      },
    },
  },
});
