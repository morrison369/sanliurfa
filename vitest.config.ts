import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Default to Node to avoid jsdom worker boot issues on current Node runtime.
    // DOM-specific tests can opt in with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/**/*.astro',
      ],
    },
  },
});
