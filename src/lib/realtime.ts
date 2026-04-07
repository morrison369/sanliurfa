/**
 * Real-time Notifications - WebSocket ile canlı guncellemeler
 * Not: Astro + Node adapter'de WebSocket desteği sınırlı
 * Production'da Socket.IO veya Pusher gibi hizmetler önerilir
 */

import { logger } from './logging';

interface RealtimeClient {
  userId: string;
  channels: Set<string>;
  lastActivity: Date;
}

interface RealtimeMessage {
  type: string;
  channel: string;
  data: Record<string, any>;
  timestamp: Date;
}

class RealtimeManager {
  private clients: Map<string, RealtimeClient> = new Map();
  private messageQueue: RealtimeMessage[] = [];
  private maxQueueSize = 1000;

  registerClient(clientId: string, userId: string): void {
    this.clients.set(clientId, {
      userId,
      channels: new Set(['general']),
      lastActivity: new Date()
    });
    logger.debug('Realtime client kayit edildi', { clientId, userId });
  }

  unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
    logger.debug('Realtime client kaldirildi', { clientId });
  }

  subscribe(clientId: string, channel: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    client.channels.add(channel);
    return true;
  }

  unsubscribe(clientId: string, channel: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;
    client.channels.delete(channel);
    return true;
  }

  async broadcast(type: string, channel: string, data: Record<string, any>): Promise<number> {
    const message: RealtimeMessage = {
      type,
      channel,
      data,
      timestamp: new Date()
    };

    this.messageQueue.push(message);
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue.shift();
    }

    let recipientCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.channels.has(channel)) {
        recipientCount++;
      }
    }

    return recipientCount;
  }

  async sendToUser(userId: string, type: string, data: Record<string, any>): Promise<number> {
    let recipientCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId) {
        recipientCount++;
      }
    }
    return recipientCount;
  }

  async notifyAdmins(type: string, data: Record<string, any>): Promise<number> {
    return this.broadcast(type, 'admin', data);
  }

  async broadcastAlert(alertType: string, message: string, severity: string): Promise<number> {
    return this.broadcast('alert', 'alerts', {
      alertType,
      message,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  getMessageHistory(channel: string, limit: number = 50): RealtimeMessage[] {
    return this.messageQueue
      .filter(m => m.channel === channel)
      .slice(-limit);
  }

  getOnlineCount(): number {
    return this.clients.size;
  }

  getSubscriberCount(channel: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.channels.has(channel)) {
        count++;
      }
    }
    return count;
  }

  getStatus(): {
    onlineClients: number;
    messageQueueSize: number;
    channels: Record<string, number>;
  } {
    const channels: Record<string, number> = {};
    for (const client of this.clients.values()) {
      for (const channel of client.channels) {
        channels[channel] = (channels[channel] || 0) + 1;
      }
    }
    return {
      onlineClients: this.clients.size,
      messageQueueSize: this.messageQueue.length,
      channels
    };
  }

  cleanup(inactivityMinutes: number = 30): number {
    const cutoffTime = new Date(Date.now() - inactivityMinutes * 60000);
    let removedCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.lastActivity < cutoffTime) {
        this.clients.delete(clientId);
        removedCount++;
      }
    }
    return removedCount;
  }
}

export const realtimeManager = new RealtimeManager();

export async function initializeRealtime(): Promise<void> {
  try {
    setInterval(() => {
      realtimeManager.cleanup(30);
    }, 5 * 60000);
    logger.info('Realtime manager initialized');
  } catch (error) {
    logger.error('Realtime initialization hatasi', error instanceof Error ? error : new Error(String(error)));
  }
}
