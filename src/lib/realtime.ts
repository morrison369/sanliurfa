// Real-time subscription manager - PostgreSQL compatible (polling-based)
// Note: PostgreSQL doesn't have native real-time like Supabase.
// For production, consider using Redis pub/sub or WebSocket server.

class RealtimeManager {
  private pollingIntervals: Map<string, any> = new Map();
  private lastCheckTimes: Map<string, Date> = new Map();

  // Subscribe to new reviews for a place (polling-based)
  subscribeToReviews(placeId: string, callback: (review: any) => void) {
    const key = `reviews:${placeId}`;
    
    if (this.pollingIntervals.has(key)) {
      this.unsubscribe(key);
    }

    this.lastCheckTimes.set(key, new Date());
    
    // Simple polling every 10 seconds (for demo purposes)
    const interval = setInterval(async () => {
      // In production, this should query your API for new reviews
      // For now, this is a placeholder
    }, 10000);

    this.pollingIntervals.set(key, interval);
    return () => this.unsubscribe(key);
  }

  // Subscribe to notifications for a user (polling-based)
  subscribeToNotifications(userId: string, callback: (notification: any) => void) {
    const key = `notifications:${userId}`;
    
    if (this.pollingIntervals.has(key)) {
      this.unsubscribe(key);
    }

    this.lastCheckTimes.set(key, new Date());
    
    const interval = setInterval(async () => {
      // In production, query API for new notifications
    }, 10000);

    this.pollingIntervals.set(key, interval);
    return () => this.unsubscribe(key);
  }

  // Subscribe to online users count (not available without WebSocket)
  subscribeToOnlineUsers(callback: (count: number) => void) {
    const key = 'online_users';
    
    // Return mock data since we don't have real-time presence
    callback(1);
    
    return () => this.unsubscribe(key);
  }

  // Unsubscribe from a channel
  unsubscribe(key: string) {
    const interval = this.pollingIntervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(key);
      this.lastCheckTimes.delete(key);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.pollingIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.pollingIntervals.clear();
    this.lastCheckTimes.clear();
  }
}

export const realtimeManager = new RealtimeManager();

// Hook for using real-time in components
export function useRealtimeReviews(placeId: string, onNewReview: (review: any) => void) {
  if (typeof window === 'undefined') return;
  
  const cleanup = realtimeManager.subscribeToReviews(placeId, onNewReview);
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
  
  return cleanup;
}

export function useRealtimeNotifications(userId: string, onNewNotification: (notification: any) => void) {
  if (typeof window === 'undefined') return;
  
  const cleanup = realtimeManager.subscribeToNotifications(userId, onNewNotification);
  
  window.addEventListener('beforeunload', cleanup);
  
  return cleanup;
}
