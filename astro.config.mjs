import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import compress from 'astro-compress';

const site = process.env.SITE_URL || 'https://sanliurfa.com';
const port = parseInt(process.env.PORT || '4321', 10);

export default defineConfig({
  site,
  output: 'server',
  adapter: node({
    mode: 'standalone',
    host: process.env.HOST || '0.0.0.0',
    port,
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
      Exclude: [(file) => file.includes('service-worker') || file.includes('sw-advanced') || file.includes('sw.js')],
    }),
  ],
  image: {
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
