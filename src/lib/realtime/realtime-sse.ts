import { logger } from '../logging';
/**
 * Real-time Manager (SSE - Server-Sent Events)
 * Connects to /api/realtime/presence for live updates
 */

interface Notification {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  createdAt: string;
}

interface RealtimeData {
  type: 'connected' | 'update' | 'error' | 'metrics' | 'kpi' | 'feed_update';
  timestamp?: string;
  onlineUsers?: number;
  trendingSearches?: string[];
  activePlaces?: string[];
  message?: string;
  userId?: string;
  unreadCount?: number;
  notificationCount?: number;
  notifications?: Notification[];
  metricsPayload?: {
    errorRate: number;
    avgDuration: number;
    p95Duration: number;
    cacheHitRate: number;
    slowRequests: number;
    totalRequests: number;
    slowestEndpoints?: any[];
    dbPool?: { active: number; idle: number; waiting: number; utilization: number };
  };
  kpiPayload?: {
    kpis: any[];
    alertCount: number;
  };
  feedPayload?: {
    activities: any[];
    count: number;
  };
}

class RealtimeManager {
  private eventSource: EventSource | null = null;
  private messageEventSource: EventSource | null = null;
  private notificationEventSource: EventSource | null = null;
  private analyticsEventSource: EventSource | null = null;
  private feedEventSource: EventSource | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private onlineUsers = 0;
  private unreadCount = 0;
  private notificationCount = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageReconnectAttempts = 0;
  private notificationReconnectAttempts = 0;
  private analyticsReconnectAttempts = 0;
  private feedReconnectAttempts = 0;

  constructor() {
    this.listeners.set('onlineUsers', new Set());
    this.listeners.set('trendingSearches', new Set());
    this.listeners.set('activePlaces', new Set());
    this.listeners.set('unreadCount', new Set());
    this.listeners.set('notifications', new Set());
    this.listeners.set('analyticsMetrics', new Set());
    this.listeners.set('analyticsKPI', new Set());
    this.listeners.set('feedUpdate', new Set());
  }

  /**
   * Connect to SSE endpoint
   */
  connect(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      this.eventSource = new EventSource('/api/realtime/presence');

      this.eventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          logger.error('Failed to parse SSE message:', error);
        }
      });

      this.eventSource.addEventListener('error', () => {
        logger.warn('SSE connection error, attempting reconnect...');
        this.reconnect();
      });

      this.reconnectAttempts = 0;
      logger.info('Connected to real-time presence');
    } catch (error) {
      logger.error('Failed to connect SSE:', error);
      this.reconnect();
    }
  }

  /**
   * Handle incoming SSE message
   */
  private handleMessage(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        logger.info('Real-time connection established');
        break;

      case 'update':
        if (data.onlineUsers !== undefined) {
          this.onlineUsers = data.onlineUsers;
          this.emit('onlineUsers', data.onlineUsers);
        }

        if (data.trendingSearches) {
          this.emit('trendingSearches', data.trendingSearches);
        }

        if (data.activePlaces) {
          this.emit('activePlaces', data.activePlaces);
        }

        if (data.unreadCount !== undefined) {
          this.unreadCount = data.unreadCount;
          this.emit('unreadCount', data.unreadCount);
        }
        break;

      case 'error':
        logger.error('Real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Subscribe to online users updates
   */
  subscribeToOnlineUsers(callback: (count: number) => void): () => void {
    const listeners = this.listeners.get('onlineUsers')!;
    listeners.add(callback);

    // Call immediately with current value
    callback(this.onlineUsers);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Subscribe to trending searches
   */
  subscribeToTrendingSearches(callback: (searches: string[]) => void): () => void {
    const listeners = this.listeners.get('trendingSearches')!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Subscribe to active places
   */
  subscribeToActivePlaces(callback: (places: string[]) => void): () => void {
    const listeners = this.listeners.get('activePlaces')!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Get current online users count
   */
  getOnlineUsers(): number {
    return this.onlineUsers;
  }

  /**
   * Connect to messaging SSE endpoint (for authenticated users)
   */
  connectToMessages(): void {
    if (this.messageEventSource) {
      this.messageEventSource.close();
    }

    try {
      this.messageEventSource = new EventSource('/api/realtime/messages');

      this.messageEventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleMessageData(data);
        } catch (error) {
          logger.error('Failed to parse message SSE:', error);
        }
      });

      this.messageEventSource.addEventListener('error', () => {
        logger.warn('Message SSE connection error, attempting reconnect...');
        this.reconnectMessages();
      });

      this.messageReconnectAttempts = 0;
      logger.info('Connected to real-time messages');
    } catch (error) {
      logger.error('Failed to connect message SSE:', error);
      this.reconnectMessages();
    }
  }

  /**
   * Handle incoming message SSE data
   */
  private handleMessageData(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        logger.info('Message real-time connection established');
        break;

      case 'update':
        if (data.unreadCount !== undefined) {
          this.unreadCount = data.unreadCount;
          this.emit('unreadCount', data.unreadCount);
        }
        break;

      case 'error':
        logger.error('Message real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect messages SSE with exponential backoff
   */
  private reconnectMessages(): void {
    if (this.messageReconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max message reconnect attempts reached');
      return;
    }

    this.messageReconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.messageReconnectAttempts - 1);

    logger.info(`Reconnecting messages in ${delay}ms (attempt ${this.messageReconnectAttempts})`);
    setTimeout(() => this.connectToMessages(), delay);
  }

  /**
   * Subscribe to unread count updates
   */
  subscribeToUnreadCount(callback: (count: number) => void): () => void {
    const listeners = this.listeners.get('unreadCount')!;
    listeners.add(callback);

    // Call immediately with current value
    callback(this.unreadCount);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Get current unread count
   */
  getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Connect to notifications SSE endpoint (for authenticated users)
   */
  connectToNotifications(): void {
    if (this.notificationEventSource) {
      this.notificationEventSource.close();
    }

    try {
      this.notificationEventSource = new EventSource('/api/realtime/notifications');

      this.notificationEventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleNotificationData(data);
        } catch (error) {
          logger.error('Failed to parse notification SSE:', error);
        }
      });

      this.notificationEventSource.addEventListener('error', () => {
        logger.warn('Notification SSE connection error, attempting reconnect...');
        this.reconnectNotifications();
      });

      this.notificationReconnectAttempts = 0;
      logger.info('Connected to real-time notifications');
    } catch (error) {
      logger.error('Failed to connect notification SSE:', error);
      this.reconnectNotifications();
    }
  }

  /**
   * Handle incoming notification SSE data
   */
  private handleNotificationData(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        logger.info('Notification real-time connection established');
        break;

      case 'update':
        if (data.notificationCount !== undefined) {
          this.notificationCount = data.notificationCount;
          this.emit('notifications', {
            count: data.notificationCount,
            notifications: data.notifications || []
          });
        }
        break;

      case 'error':
        logger.error('Notification real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect notifications SSE with exponential backoff
   */
  private reconnectNotifications(): void {
    if (this.notificationReconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max notification reconnect attempts reached');
      return;
    }

    this.notificationReconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.notificationReconnectAttempts - 1);

    logger.info(`Reconnecting notifications in ${delay}ms (attempt ${this.notificationReconnectAttempts})`);
    setTimeout(() => this.connectToNotifications(), delay);
  }

  /**
   * Subscribe to notification updates
   */
  subscribeToNotifications(callback: (data: { count: number; notifications: Notification[] }) => void): () => void {
    const listeners = this.listeners.get('notifications')!;
    listeners.add(callback);

    // Call immediately with current value
    callback({
      count: this.notificationCount,
      notifications: []
    });

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Connect to analytics SSE endpoint (for admin users)
   */
  connectToAnalytics(): void {
    if (this.analyticsEventSource) {
      this.analyticsEventSource.close();
    }

    try {
      this.analyticsEventSource = new EventSource('/api/realtime/analytics');

      this.analyticsEventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleAnalyticsData(data);
        } catch (error) {
          logger.error('Failed to parse analytics SSE:', error);
        }
      });

      this.analyticsEventSource.addEventListener('error', () => {
        logger.warn('Analytics SSE connection error, attempting reconnect...');
        this.reconnectAnalytics();
      });

      this.analyticsReconnectAttempts = 0;
      logger.info('Connected to real-time analytics');
    } catch (error) {
      logger.error('Failed to connect analytics SSE:', error);
      this.reconnectAnalytics();
    }
  }

  /**
   * Handle incoming analytics SSE data
   */
  private handleAnalyticsData(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        logger.info('Analytics real-time connection established');
        break;

      case 'metrics':
        if (data.metricsPayload) {
          this.emit('analyticsMetrics', data.metricsPayload);
        }
        break;

      case 'kpi':
        if (data.kpiPayload) {
          this.emit('analyticsKPI', data.kpiPayload);
        }
        break;

      case 'error':
        logger.error('Analytics real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect analytics SSE with exponential backoff
   */
  private reconnectAnalytics(): void {
    if (this.analyticsReconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max analytics reconnect attempts reached');
      return;
    }

    this.analyticsReconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.analyticsReconnectAttempts - 1);

    logger.info(`Reconnecting analytics in ${delay}ms (attempt ${this.analyticsReconnectAttempts})`);
    setTimeout(() => this.connectToAnalytics(), delay);
  }

  /**
   * Subscribe to analytics metrics updates
   */
  onAnalyticsMetrics(callback: (metrics: any) => void): () => void {
    const listeners = this.listeners.get('analyticsMetrics')!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Subscribe to analytics KPI updates
   */
  onAnalyticsKPI(callback: (kpi: any) => void): () => void {
    const listeners = this.listeners.get('analyticsKPI')!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Connect to social feed SSE endpoint (for authenticated users)
   */
  connectToFeed(): void {
    if (this.feedEventSource) {
      this.feedEventSource.close();
    }

    try {
      this.feedEventSource = new EventSource('/api/realtime/feed');

      this.feedEventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleFeedData(data);
        } catch (error) {
          logger.error('Failed to parse feed SSE:', error);
        }
      });

      this.feedEventSource.addEventListener('error', () => {
        logger.warn('Feed SSE connection error, attempting reconnect...');
        this.reconnectFeed();
      });

      this.feedReconnectAttempts = 0;
      logger.info('Connected to real-time feed');
    } catch (error) {
      logger.error('Failed to connect feed SSE:', error);
      this.reconnectFeed();
    }
  }

  /**
   * Handle incoming feed SSE data
   */
  private handleFeedData(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        logger.info('Feed real-time connection established');
        break;

      case 'feed_update':
        if (data.feedPayload) {
          this.emit('feedUpdate', data.feedPayload);
        }
        break;

      case 'error':
        logger.error('Feed real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect feed SSE with exponential backoff
   */
  private reconnectFeed(): void {
    if (this.feedReconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max feed reconnect attempts reached');
      return;
    }

    this.feedReconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.feedReconnectAttempts - 1);

    logger.info(`Reconnecting feed in ${delay}ms (attempt ${this.feedReconnectAttempts})`);
    setTimeout(() => this.connectToFeed(), delay);
  }

  /**
   * Subscribe to feed updates
   */
  onFeedUpdate(callback: (data: { activities: any[]; count: number }) => void): () => void {
    const listeners = this.listeners.get('feedUpdate')!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Disconnect from SSE
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      logger.info('Disconnected from real-time presence');
    }

    if (this.messageEventSource) {
      this.messageEventSource.close();
      this.messageEventSource = null;
      logger.info('Disconnected from real-time messages');
    }

    if (this.notificationEventSource) {
      this.notificationEventSource.close();
      this.notificationEventSource = null;
      logger.info('Disconnected from real-time notifications');
    }

    if (this.analyticsEventSource) {
      this.analyticsEventSource.close();
      this.analyticsEventSource = null;
      logger.info('Disconnected from real-time analytics');
    }

    if (this.feedEventSource) {
      this.feedEventSource.close();
      this.feedEventSource = null;
      logger.info('Disconnected from real-time feed');
    }
  }
}

export type { Notification };

// Export singleton instance
export const realtimeManager = new RealtimeManager();

// Auto-connect when this module loads (client-side)
if (typeof window !== 'undefined') {
  // Only connect if not already connected
  if (!realtimeManager['eventSource']) {
    realtimeManager.connect();
  }
}

export type { RealtimeData };
