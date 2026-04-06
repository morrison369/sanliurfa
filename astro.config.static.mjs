import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// STATIC EXPORT - Node.js gerektirmez
// CWP/Apache shared hosting için ideal

export default defineConfig({
  output: 'static',
  integrations: [
    tailwind(),
    react(),
    sitemap(),
    mdx(),
  ],
  site: 'https://sanliurfa.com',
  vite: {
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
          },
        },
      },
    },
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
});
