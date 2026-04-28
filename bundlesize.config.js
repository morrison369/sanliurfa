/**
 * Bundle Size Configuration
 * Limits for JavaScript chunks
 */

module.exports = {
  files: [
    {
      path: "dist/client/_astro/*.js",
      maxSize: "200 kB",
      compression: "gzip",
    },
    {
      path: "dist/client/_astro/index*.js",
      maxSize: "150 kB",
      compression: "gzip",
    },
    {
      path: "dist/client/sw.js",
      maxSize: "50 kB",
      compression: "gzip",
    }
  ],
  
  // Error if bundle exceeds limit
  fail: true,
  
  // Custom reporter
  reporter: "default"
};
