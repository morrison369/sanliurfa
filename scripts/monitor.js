#!/usr/bin/env node
/**
 * Application Health Monitor
 * Tracks key metrics and alerts on issues
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(process.cwd(), 'logs', 'monitor.log');
const ALERT_FILE = path.join(process.cwd(), 'logs', 'alerts.log');

// Ensure log directory exists
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

class Monitor {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requests: 0,
      errors: 0,
      responseTime: [],
      lastCheck: Date.now()
    };
    this.thresholds = {
      errorRate: 0.05,      // 5% error rate
      avgResponseTime: 500, // 500ms
      memoryUsage: 0.8      // 80% memory
    };
  }

  log(level, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(LOG_FILE, line);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  alert(message, severity = 'warning') {
    const entry = {
      timestamp: new Date().toISOString(),
      severity,
      message
    };
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(ALERT_FILE, line);
    console.error(`[ALERT:${severity.toUpperCase()}] ${message}`);
  }

  checkSystemHealth() {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed / memUsage.heapTotal;
    
    if (heapUsed > this.thresholds.memoryUsage) {
      this.alert(`High memory usage: ${(heapUsed * 100).toFixed(1)}%`, 'critical');
    }

    const uptime = (Date.now() - this.metrics.startTime) / 1000;
    const errorRate = this.metrics.requests > 0 
      ? this.metrics.errors / this.metrics.requests 
      : 0;

    if (errorRate > this.thresholds.errorRate) {
      this.alert(`High error rate: ${(errorRate * 100).toFixed(1)}%`, 'critical');
    }

    const avgResponse = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    if (avgResponse > this.thresholds.avgResponseTime) {
      this.alert(`High response time: ${avgResponse.toFixed(0)}ms`, 'warning');
    }

    this.log('info', 'Health check completed', {
      uptime,
      memory: `${(heapUsed * 100).toFixed(1)}%`,
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
      avgResponse: `${avgResponse.toFixed(0)}ms`,
      totalRequests: this.metrics.requests
    });
  }

  trackRequest(duration, error = false) {
    this.metrics.requests++;
    this.metrics.responseTime.push(duration);
    
    // Keep last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }

    if (error) {
      this.metrics.errors++;
    }
  }

  start(intervalMs = 60000) {
    this.log('info', 'Monitor started', { interval: intervalMs });
    
    setInterval(() => {
      this.checkSystemHealth();
    }, intervalMs);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.log('info', 'Monitor stopping');
      process.exit(0);
    });
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new Monitor();
  monitor.start();
}

module.exports = { Monitor };
