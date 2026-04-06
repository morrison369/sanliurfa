module.exports = {
  apps: [
    {
      name: 'sanliurfa',
      script: './dist/server/entry.mjs',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      merge_logs: true,
      max_memory_restart: '1G',
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
      // Environment file
      env_file: '.env',
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Monitoring
      monitoring: false,
      // PM2 Plus (optional)
      pmx: false,
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
