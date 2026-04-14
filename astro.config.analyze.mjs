import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import compress from 'astro-compress';
import { visualizer } from 'rollup-plugin-visualizer';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind({
      configFile: './tailwind.config.mjs',
    }),
    compress({
      CSS: true,
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: true,
    }),
  ],
  
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  
  vite: {
    build: {
      rollupOptions: {
        plugins: [
          // Bundle visualizer
          visualizer({
            filename: './bundle-analysis.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap', // 'treemap', 'sunburst', 'network'
          }),
        ],
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tabs',
            ],
            'utils': ['lodash-es', 'date-fns', 'zod'],
          },
        },
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 500, // KB
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'zod'],
    },
  },
  
  // Build options
  build: {
    format: 'file',
    assets: '_astro',
  },
});
