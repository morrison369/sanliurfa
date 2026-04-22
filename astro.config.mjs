import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import partytown from '@astrojs/partytown';
import compress from 'astro-compress';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.SITE_URL || 'https://sanliurfa.com';
const appPort = Number(process.env.PORT || 4321);

export default defineConfig({
  site,
  output: 'server',
  adapter: node({
    mode: 'standalone',
    port: appPort,
  }),
  integrations: [
    mdx(),
    react(),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
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
    plugins: [tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: 4321,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 4321,
      strictPort: true,
    },
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
