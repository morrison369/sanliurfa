module.exports = {
  apps: [
    {
      name: 'sanliurfa',
      script: './dist/server/entry.mjs',
      // CWP Shared Hosting: Single instance (cluster mode requires more resources)
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Log files with rotation
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      // Log rotation settings
      log_rotate: true,
      log_max_size: '10M',
      log_retention: '7d',
      // Memory management
      max_memory_restart: '512M',  // Lower for CWP shared hosting
      restart_delay: 3000,
      max_restarts: 5,
      min_uptime: '10s',
      // Health check
      health_check_grace_period: 30000,
      health_check_fatal_exceptions: true,
      // Auto-restart on failure
      autorestart: true,
      // Don't restart if crashing too fast
      exp_backoff_restart_delay: 100,
      // Environment file (ensure .env has 600 permissions)
      env_file: '.env',
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Monitoring
      monitoring: false,
      // PM2 Plus (optional)
      pmx: false,
      // Kill timeout
      kill_timeout: 5000,
      // Listen timeout
      listen_timeout: 10000,
    },
  ],
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/sanliurfa.com.git',
      path: '/var/www/sanliurfa.com',
      'post-deploy': 'npm install --legacy-peer-deps && npm run build && pm2 reload ecosystem.config.cjs --env production',
      'pre-setup': 'apt-get update && apt-get install -y git nodejs npm',
      'post-setup': 'npm install -g pm2',
    },
  },
};
