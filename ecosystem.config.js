/**
 * PM2 Ecosystem Configuration
 * Production deployment for Şanlıurfa.com
 */

module.exports = {
  apps: [
    {
      // Uygulama adı
      name: 'sanliurfa',
      script: './dist/server/entry.mjs',

      // Cluster mode - CPU cores kadar process
      instances: 'max',
      exec_mode: 'cluster',

      // Graceful shutdown
      wait_ready: true,
      listen_timeout: 3000,
      kill_timeout: 5000,

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 6000,
        LOG_LEVEL: 'info'
      },

      // Logging
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Memory limit
      max_memory_restart: '500M',

      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',

      // Watch mode (development only)
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs', '.git'],

      // Merge logs
      merge_logs: true,

      // Auto restart on file changes (dev)
      // watch: ['src'],
      // ignore_watch: ['node_modules', 'logs'],
      // exp_backoff_restart_delay: 100,
    }
  ],

  // Deployment konfigürasyonu
  deploy: {
    production: {
      user: 'sanliurfa',
      host: 'sanliurfa.com',
      ref: 'origin/main',
      repo: 'git@github.com:sanliurfa/sanliurfa.com.git',
      path: '/home/sanliurfa/sanliurfa',
      'post-deploy': 'npm install --legacy-peer-deps && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
