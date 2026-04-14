/**
 * Presence Tracking Module
 * Stub for user presence and activity tracking
 */

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  currentPage?: string;
}

export class PresenceTracker {
  private presences: Map<string, UserPresence> = new Map();

  setOnline(userId: string, currentPage?: string): void {
    this.presences.set(userId, {
      userId,
      status: 'online',
      lastSeen: new Date(),
      currentPage
    });
  }

  setAway(userId: string): void {
    const presence = this.presences.get(userId);
    if (presence) {
      presence.status = 'away';
      presence.lastSeen = new Date();
    }
  }

  setOffline(userId: string): void {
    const presence = this.presences.get(userId);
    if (presence) {
      presence.status = 'offline';
      presence.lastSeen = new Date();
    }
  }

  getPresence(userId: string): UserPresence | undefined {
    return this.presences.get(userId);
  }

  getOnlineUsers(): string[] {
    return Array.from(this.presences.values())
      .filter(p => p.status === 'online')
      .map(p => p.userId);
  }
}

export const presenceTracker = new PresenceTracker();
export default presenceTracker;
