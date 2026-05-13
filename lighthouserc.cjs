module.exports = {
  ci: {
    collect: {
      // Number of runs to perform
      numberOfRuns: 3,
      
      // Start server command
      startServerCommand: 'npm run preview',
      
      // Server ready pattern
      startServerReadyPattern: 'ready in',
      
      // Server ready timeout
      startServerReadyTimeout: 60000,
      
      // URLs to test
      url: [
        'http://localhost:4321/',
        'http://localhost:4321/places',
        'http://localhost:4321/hakkinda',
        'http://localhost:4321/iletisim',
      ],
      
      // Chrome flags
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless',
      },
    },
    
    assert: {
      // Performance assertions
      assertions: {
        // Core Web Vitals
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        
        // Specific metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        
        // Resource budgets
        'resource-summary:document:size': ['warn', { maxNumericValue: 20000 }], // 20KB
        'resource-summary:stylesheet:size': ['warn', { maxNumericValue: 50000 }], // 50KB
        'resource-summary:script:size': ['warn', { maxNumericValue: 300000 }], // 300KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }], // 500KB
        'resource-summary:total:size': ['warn', { maxNumericValue: 2000000 }], // 2MB
        
        // Third party
        'third-party-summary': ['warn', { maxNumericValue: 100000 }], // 100KB
      },
    },
    
    upload: {
      // Upload to temporary storage
      target: 'temporary-public-storage',
    },
  },
};
