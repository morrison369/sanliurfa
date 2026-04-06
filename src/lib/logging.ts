// Structured logging
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  requestId?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  
  private log(entry: LogEntry) {
    const logData = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    
    // In development, log to console
    if (this.isDevelopment) {
      const consoleMethod = entry.level === LogLevel.ERROR ? 'error' : 
                           entry.level === LogLevel.WARN ? 'warn' : 'log';
      console[consoleMethod](`[${entry.level.toUpperCase()}]`, entry.message, entry.context || '');
      return;
    }
    
    // In production, send to logging service
    // TODO: Integrate with Sentry, LogRocket, or custom endpoint
    this.sendToLoggingService(logData);
  }
  
  private async sendToLoggingService(entry: LogEntry) {
    try {
      // Send to your logging endpoint
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Fallback to console if logging service fails
      console.error('Failed to send log:', error);
    }
  }
  
  debug(message: string, context?: Record<string, any>) {
    this.log({ level: LogLevel.DEBUG, message, context });
  }
  
  info(message: string, context?: Record<string, any>) {
    this.log({ level: LogLevel.INFO, message, context });
  }
  
  warn(message: string, context?: Record<string, any>) {
    this.log({ level: LogLevel.WARN, message, context });
  }
  
  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log({ 
      level: LogLevel.ERROR, 
      message, 
      error,
      context: {
        ...context,
        stack: error?.stack,
      }
    });
  }
  
  // Request logging
  logRequest(method: string, url: string, status: number, duration: number, userId?: string) {
    this.info(`${method} ${url} ${status} ${duration}ms`, {
      method,
      url,
      status,
      duration,
      userId,
    });
  }
}

export const logger = new Logger();
