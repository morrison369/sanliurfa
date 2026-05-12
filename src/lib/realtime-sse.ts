import { logger } from './logging';
import { randomBytes } from 'node:crypto';
/**
 * Real-time SSE (Server-Sent Events) Module
 * Stub implementation for real-time updates
 */

export interface SSEConnection {
  id: string;
  userId?: string;
  channel: string;
  connectedAt: Date;
}

export interface SSEMessage {
  event: string;
  data: unknown;
  timestamp: Date;
}

function withOptional<K extends string, V>(key: K, value: V | null | undefined): { [P in K]?: V } {
  if (value === null || value === undefined) {
    return {} as { [P in K]?: V };
  }
  return { [key]: value } as { [P in K]?: V };
}

export class SSEManager {
  private connections: Map<string, SSEConnection> = new Map();
  onOnlineUsersUpdate: ((count: number) => void) | null = null;
  
  connect(channel: string, userId?: string): SSEConnection {
    const connection: SSEConnection = {
      id: randomBytes(6).toString('hex'),
      channel,
      connectedAt: new Date(),
      ...withOptional('userId', userId),
    };
    this.connections.set(connection.id, connection);
    return connection;
  }
  
  disconnect(connectionId: string): void {
    this.connections.delete(connectionId);
  }
  
  broadcast(channel: string, event: string, data: unknown): void {
    // Stub implementation
    logger.info(`[SSE] Broadcast to ${channel}:`, { event, data });
  }
  
  sendToUser(userId: string, event: string, data: unknown): void {
    // Stub implementation
    logger.info(`[SSE] Send to user ${userId}:`, { event, data });
  }
  
  getConnectionCount(channel?: string): number {
    if (!channel) return this.connections.size;
    return Array.from(this.connections.values())
      .filter(c => c.channel === channel).length;
  }
}

// Online users tracking
export function getOnlineUsers(): string[] {
  return [];
}

export function subscribeToOnlineUsers(callback: (count: number) => void): () => void {
  // Stub subscription
  callback(0);
  return () => {};
}

// Notification badge
export function getUnreadNotificationCount(_userId: string): number {
  return 0;
}

export function subscribeToNotifications(
  _userId: string, 
  callback: (count: number) => void
): () => void {
  callback(0);
  return () => {};
}

// Singleton instance
export const sseManager = new SSEManager();
export const realtimeManager = sseManager;

export default sseManager;
