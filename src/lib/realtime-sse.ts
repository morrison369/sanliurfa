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
  private static readonly MAX_LISTENERS_PER_EVENT = 25;
  private eventSource: EventSource | null = null;
  private messageEventSource: EventSource | null = null;
  private notificationEventSource: EventSource | null = null;
  private analyticsEventSource: EventSource | null = null;
  private feedEventSource: EventSource | null = null;
  private presenceReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private notificationReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private analyticsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private feedReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private onlineUsers = 0;
  private unreadCount = 0;
  private notificationCount = 0;
  private latestNotifications: Notification[] = [];
  private latestAnalyticsMetrics: RealtimeData['metricsPayload'] | null = null;
  private latestAnalyticsKPI: RealtimeData['kpiPayload'] | null = null;
  private latestFeedPayload: RealtimeData['feedPayload'] | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageReconnectAttempts = 0;
  private notificationReconnectAttempts = 0;
  private analyticsReconnectAttempts = 0;
  private feedReconnectAttempts = 0;
  private disconnected = false;

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
    this.disconnected = false;
    this.clearReconnectTimer('presence');
    if (this.eventSource) {
      return;
    }

    try {
      this.eventSource = new EventSource('/api/realtime/presence');

      this.eventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      });

      this.eventSource.addEventListener('error', () => {
        console.warn('SSE connection error, attempting reconnect...');
        this.eventSource?.close();
        this.eventSource = null;
        this.reconnect();
      });

      this.reconnectAttempts = 0;
      console.log('Connected to real-time presence');
    } catch (error) {
      console.error('Failed to connect SSE:', error);
      this.reconnect();
    }
  }

  /**
   * Handle incoming SSE message
   */
  private handleMessage(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        console.log('Real-time connection established');
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
        console.error('Real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect(): void {
    if (this.disconnected || this.presenceReconnectTimer) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.presenceReconnectTimer = setTimeout(() => {
      this.presenceReconnectTimer = null;
      if (!this.disconnected) {
        this.connect();
      }
    }, delay);
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
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  private subscribe<T>(event: string, callback: (data: T) => void, immediateValue?: T): () => void {
    const listeners = this.listeners.get(event)!;

    if (listeners.has(callback)) {
      if (arguments.length === 3) {
        callback(immediateValue as T);
      }
      return () => {
        listeners.delete(callback);
      };
    }

    if (listeners.size >= RealtimeManager.MAX_LISTENERS_PER_EVENT) {
      console.warn(`Listener cap reached for ${event}`);
      return () => {};
    }

    listeners.add(callback);

    if (arguments.length === 3) {
      callback(immediateValue as T);
    }

    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Subscribe to online users updates
   */
  subscribeToOnlineUsers(callback: (count: number) => void): () => void {
    return this.subscribe('onlineUsers', callback, this.onlineUsers);
  }

  /**
   * Subscribe to trending searches
   */
  subscribeToTrendingSearches(callback: (searches: string[]) => void): () => void {
    return this.subscribe('trendingSearches', callback);
  }

  /**
   * Subscribe to active places
   */
  subscribeToActivePlaces(callback: (places: string[]) => void): () => void {
    return this.subscribe('activePlaces', callback);
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
    this.disconnected = false;
    this.clearReconnectTimer('message');
    if (this.messageEventSource) {
      return;
    }

    try {
      this.messageEventSource = new EventSource('/api/realtime/messages');

      this.messageEventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleMessageData(data);
        } catch (error) {
          console.error('Failed to parse message SSE:', error);
        }
      });

      this.messageEventSource.addEventListener('error', () => {
        console.warn('Message SSE connection error, attempting reconnect...');
        this.messageEventSource?.close();
        this.messageEventSource = null;
        this.reconnectMessages();
      });

      this.messageReconnectAttempts = 0;
      console.log('Connected to real-time messages');
    } catch (error) {
      console.error('Failed to connect message SSE:', error);
      this.reconnectMessages();
    }
  }

  /**
   * Handle incoming message SSE data
   */
  private handleMessageData(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        console.log('Message real-time connection established');
        break;

      case 'update':
        if (data.unreadCount !== undefined) {
          this.unreadCount = data.unreadCount;
          this.emit('unreadCount', data.unreadCount);
        }
        break;

      case 'error':
        console.error('Message real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect messages SSE with exponential backoff
   */
  private reconnectMessages(): void {
    if (this.disconnected || this.messageReconnectTimer) {
      return;
    }

    if (this.messageReconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max message reconnect attempts reached');
      return;
    }

    this.messageReconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.messageReconnectAttempts - 1);

    console.log(`Reconnecting messages in ${delay}ms (attempt ${this.messageReconnectAttempts})`);
    this.messageReconnectTimer = setTimeout(() => {
      this.messageReconnectTimer = null;
      if (!this.disconnected) {
        this.connectToMessages();
      }
    }, delay);
  }

  /**
   * Subscribe to unread count updates
   */
  subscribeToUnreadCount(callback: (count: number) => void): () => void {
    return this.subscribe('unreadCount', callback, this.unreadCount);
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
    this.disconnected = false;
    this.clearReconnectTimer('notification');
    if (this.notificationEventSource) {
      return;
    }

    try {
      this.notificationEventSource = new EventSource('/api/realtime/notifications');

      this.notificationEventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleNotificationData(data);
        } catch (error) {
          console.error('Failed to parse notification SSE:', error);
        }
      });

      this.notificationEventSource.addEventListener('error', () => {
        console.warn('Notification SSE connection error, attempting reconnect...');
        this.notificationEventSource?.close();
        this.notificationEventSource = null;
        this.reconnectNotifications();
      });

      this.notificationReconnectAttempts = 0;
      console.log('Connected to real-time notifications');
    } catch (error) {
      console.error('Failed to connect notification SSE:', error);
      this.reconnectNotifications();
    }
  }

  /**
   * Handle incoming notification SSE data
   */
  private handleNotificationData(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        console.log('Notification real-time connection established');
        break;

      case 'update':
        if (data.notificationCount !== undefined) {
          this.notificationCount = data.notificationCount;
          this.latestNotifications = data.notifications || [];
          this.emit('notifications', {
            count: data.notificationCount,
            notifications: this.latestNotifications
          });
        }
        break;

      case 'error':
        console.error('Notification real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect notifications SSE with exponential backoff
   */
  private reconnectNotifications(): void {
    if (this.disconnected || this.notificationReconnectTimer) {
      return;
    }

    if (this.notificationReconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max notification reconnect attempts reached');
      return;
    }

    this.notificationReconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.notificationReconnectAttempts - 1);

    console.log(`Reconnecting notifications in ${delay}ms (attempt ${this.notificationReconnectAttempts})`);
    this.notificationReconnectTimer = setTimeout(() => {
      this.notificationReconnectTimer = null;
      if (!this.disconnected) {
        this.connectToNotifications();
      }
    }, delay);
  }

  /**
   * Subscribe to notification updates
   */
  subscribeToNotifications(callback: (data: { count: number; notifications: Notification[] }) => void): () => void {
    return this.subscribe('notifications', callback, {
      count: this.notificationCount,
      notifications: this.latestNotifications
    });
  }

  /**
   * Connect to analytics SSE endpoint (for admin users)
   */
  connectToAnalytics(): void {
    this.disconnected = false;
    this.clearReconnectTimer('analytics');
    if (this.analyticsEventSource) {
      return;
    }

    try {
      this.analyticsEventSource = new EventSource('/api/realtime/analytics');

      this.analyticsEventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleAnalyticsData(data);
        } catch (error) {
          console.error('Failed to parse analytics SSE:', error);
        }
      });

      this.analyticsEventSource.addEventListener('error', () => {
        console.warn('Analytics SSE connection error, attempting reconnect...');
        this.analyticsEventSource?.close();
        this.analyticsEventSource = null;
        this.reconnectAnalytics();
      });

      this.analyticsReconnectAttempts = 0;
      console.log('Connected to real-time analytics');
    } catch (error) {
      console.error('Failed to connect analytics SSE:', error);
      this.reconnectAnalytics();
    }
  }

  /**
   * Handle incoming analytics SSE data
   */
  private handleAnalyticsData(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        console.log('Analytics real-time connection established');
        break;

      case 'metrics':
        if (data.metricsPayload) {
          this.latestAnalyticsMetrics = data.metricsPayload;
          this.emit('analyticsMetrics', data.metricsPayload);
        }
        break;

      case 'kpi':
        if (data.kpiPayload) {
          this.latestAnalyticsKPI = data.kpiPayload;
          this.emit('analyticsKPI', data.kpiPayload);
        }
        break;

      case 'error':
        console.error('Analytics real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect analytics SSE with exponential backoff
   */
  private reconnectAnalytics(): void {
    if (this.disconnected || this.analyticsReconnectTimer) {
      return;
    }

    if (this.analyticsReconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max analytics reconnect attempts reached');
      return;
    }

    this.analyticsReconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.analyticsReconnectAttempts - 1);

    console.log(`Reconnecting analytics in ${delay}ms (attempt ${this.analyticsReconnectAttempts})`);
    this.analyticsReconnectTimer = setTimeout(() => {
      this.analyticsReconnectTimer = null;
      if (!this.disconnected) {
        this.connectToAnalytics();
      }
    }, delay);
  }

  /**
   * Subscribe to analytics metrics updates
   */
  onAnalyticsMetrics(callback: (metrics: any) => void): () => void {
    if (this.latestAnalyticsMetrics) {
      return this.subscribe('analyticsMetrics', callback, this.latestAnalyticsMetrics);
    }
    return this.subscribe('analyticsMetrics', callback);
  }

  /**
   * Subscribe to analytics KPI updates
   */
  onAnalyticsKPI(callback: (kpi: any) => void): () => void {
    if (this.latestAnalyticsKPI) {
      return this.subscribe('analyticsKPI', callback, this.latestAnalyticsKPI);
    }
    return this.subscribe('analyticsKPI', callback);
  }

  /**
   * Connect to social feed SSE endpoint (for authenticated users)
   */
  connectToFeed(): void {
    this.disconnected = false;
    this.clearReconnectTimer('feed');
    if (this.feedEventSource) {
      return;
    }

    try {
      this.feedEventSource = new EventSource('/api/realtime/feed');

      this.feedEventSource.addEventListener('message', (event) => {
        try {
          const data: RealtimeData = JSON.parse(event.data);
          this.handleFeedData(data);
        } catch (error) {
          console.error('Failed to parse feed SSE:', error);
        }
      });

      this.feedEventSource.addEventListener('error', () => {
        console.warn('Feed SSE connection error, attempting reconnect...');
        this.feedEventSource?.close();
        this.feedEventSource = null;
        this.reconnectFeed();
      });

      this.feedReconnectAttempts = 0;
      console.log('Connected to real-time feed');
    } catch (error) {
      console.error('Failed to connect feed SSE:', error);
      this.reconnectFeed();
    }
  }

  /**
   * Handle incoming feed SSE data
   */
  private handleFeedData(data: RealtimeData): void {
    switch (data.type) {
      case 'connected':
        console.log('Feed real-time connection established');
        break;

      case 'feed_update':
        if (data.feedPayload) {
          this.latestFeedPayload = data.feedPayload;
          this.emit('feedUpdate', data.feedPayload);
        }
        break;

      case 'error':
        console.error('Feed real-time error:', data.message);
        break;
    }
  }

  /**
   * Reconnect feed SSE with exponential backoff
   */
  private reconnectFeed(): void {
    if (this.disconnected || this.feedReconnectTimer) {
      return;
    }

    if (this.feedReconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max feed reconnect attempts reached');
      return;
    }

    this.feedReconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.feedReconnectAttempts - 1);

    console.log(`Reconnecting feed in ${delay}ms (attempt ${this.feedReconnectAttempts})`);
    this.feedReconnectTimer = setTimeout(() => {
      this.feedReconnectTimer = null;
      if (!this.disconnected) {
        this.connectToFeed();
      }
    }, delay);
  }

  private clearReconnectTimer(kind: 'presence' | 'message' | 'notification' | 'analytics' | 'feed'): void {
    const timerMap = {
      presence: 'presenceReconnectTimer',
      message: 'messageReconnectTimer',
      notification: 'notificationReconnectTimer',
      analytics: 'analyticsReconnectTimer',
      feed: 'feedReconnectTimer'
    } as const;

    const timerKey = timerMap[kind];
    const timer = this[timerKey];
    if (timer) {
      clearTimeout(timer);
      this[timerKey] = null;
    }
  }

  /**
   * Subscribe to feed updates
   */
  onFeedUpdate(callback: (data: { activities: any[]; count: number }) => void): () => void {
    if (this.latestFeedPayload) {
      return this.subscribe('feedUpdate', callback, this.latestFeedPayload);
    }
    return this.subscribe('feedUpdate', callback);
  }

  /**
   * Disconnect from SSE
   */
  disconnect(): void {
    this.disconnected = true;
    this.clearReconnectTimer('presence');
    this.clearReconnectTimer('message');
    this.clearReconnectTimer('notification');
    this.clearReconnectTimer('analytics');
    this.clearReconnectTimer('feed');

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('Disconnected from real-time presence');
    }

    if (this.messageEventSource) {
      this.messageEventSource.close();
      this.messageEventSource = null;
      console.log('Disconnected from real-time messages');
    }

    if (this.notificationEventSource) {
      this.notificationEventSource.close();
      this.notificationEventSource = null;
      console.log('Disconnected from real-time notifications');
    }

    if (this.analyticsEventSource) {
      this.analyticsEventSource.close();
      this.analyticsEventSource = null;
      console.log('Disconnected from real-time analytics');
    }

    if (this.feedEventSource) {
      this.feedEventSource.close();
      this.feedEventSource = null;
      console.log('Disconnected from real-time feed');
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
