module.exports = {
  apps: [{
    name: 'sanliurfa',
    script: './dist/server/entry.mjs',
    instances: 'max',        // Use all CPU cores
    exec_mode: 'cluster',    // Cluster mode
    max_memory_restart: '1G',
    
    env: {
      NODE_ENV: 'production',
      PORT: 4321,
    },
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto restart
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Watch mode (dev only)
    watch: false,
    
    // Health check
    health_check_grace_period: 30000,
    
    // Environment-specific
    env_production: {
      NODE_ENV: 'production',
    },
    env_development: {
      NODE_ENV: 'development',
      watch: true,
    },
  }],
  
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/sanliurfa.git',
      path: '/var/www/sanliurfa',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
    },
  },
};
