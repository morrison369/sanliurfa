/**
 * Phase 116: Presence & Activity Tracking
 * Detailed user presence with typing indicators and activity status
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type PresenceStatus = 'online' | 'away' | 'idle' | 'offline' | 'in-meeting' | 'do-not-disturb';

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  location?: string; // document ID or channel ID
  lastActive: number;
  statusMessage?: string;
  statusExpiry?: number;
  device?: string;
  browser?: string;
}

export interface TypingState {
  userId: string;
  channelId: string;
  documentId?: string;
  startedAt: number;
  expiresAt: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  context: Record<string, any>;
  timestamp: number;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  documentId: string;
  timestamp: number;
}

// ==================== PRESENCE MANAGER ====================

export class PresenceManager {
  private presenceMap = new Map<string, UserPresence>();
  private locationPresence = new Map<string, Set<string>>();
  private presenceCount = 0;

  /**
   * Set user presence
   */
  setUserPresence(userId: string, presence: Partial<UserPresence>): UserPresence {
    const existing = this.presenceMap.get(userId);

    const userPresence: UserPresence = {
      userId,
      status: presence.status || 'online',
      location: presence.location,
      lastActive: Date.now(),
      statusMessage: presence.statusMessage,
      statusExpiry: presence.statusExpiry,
      device: presence.device,
      browser: presence.browser
    };

    this.presenceMap.set(userId, userPresence);

    // Update location presence
    if (presence.location) {
      const locationUsers = this.locationPresence.get(presence.location) || new Set();
      locationUsers.add(userId);
      this.locationPresence.set(presence.location, locationUsers);
    }

    logger.debug('User presence set', {
      userId,
      status: userPresence.status,
      location: userPresence.location
    });

    return userPresence;
  }

  /**
   * Get user presence
   */
  getUserPresence(userId: string): UserPresence | null {
    return this.presenceMap.get(userId) || null;
  }

  /**
   * Get location presence (who's viewing a document/channel)
   */
  getLocationPresence(locationId: string): string[] {
    const users = this.locationPresence.get(locationId) || new Set();
    return Array.from(users);
  }

  /**
   * Get channel presence with cursor info
   */
  getChannelPresence(channelId: string): UserPresence[] {
    const userIds = this.getLocationPresence(channelId);
    return userIds
      .map(userId => this.presenceMap.get(userId))
      .filter((p): p is UserPresence => p !== null);
  }

  /**
   * Update user status
   */
  updateStatus(userId: string, status: PresenceStatus, message?: string, expiryMs?: number): void {
    const presence = this.presenceMap.get(userId);
    if (presence) {
      presence.status = status;
      presence.statusMessage = message;
      presence.statusExpiry = expiryMs ? Date.now() + expiryMs : undefined;
      presence.lastActive = Date.now();
      logger.debug('User status updated', { userId, status, message });
    }
  }

  /**
   * Remove user presence
   */
  removePresence(userId: string): void {
    const presence = this.presenceMap.get(userId);
    if (presence && presence.location) {
      const locationUsers = this.locationPresence.get(presence.location);
      if (locationUsers) {
        locationUsers.delete(userId);
      }
    }

    this.presenceMap.delete(userId);
    logger.debug('User presence removed', { userId });
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): UserPresence[] {
    const users: UserPresence[] = [];

    for (const presence of this.presenceMap.values()) {
      if (presence.status === 'online' && Date.now() < (presence.statusExpiry || Infinity)) {
        users.push(presence);
      }
    }

    return users;
  }

  /**
   * Cleanup expired status messages
   */
  cleanupExpiredStatus(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const presence of this.presenceMap.values()) {
      if (presence.statusExpiry && presence.statusExpiry < now) {
        presence.statusMessage = undefined;
        presence.statusExpiry = undefined;
        cleaned++;
      }
    }

    return cleaned;
  }
}

// ==================== TYPING INDICATOR ====================

export class TypingIndicator {
  private typingStates = new Map<string, TypingState>();
  private typingCount = 0;
  private typingTimeout = 5000; // 5 seconds default

  /**
   * Start typing
   */
  startTyping(userId: string, channelId: string, documentId?: string): TypingState {
    const id = userId + '-' + channelId + '-' + this.typingCount++;

    const typingState: TypingState = {
      userId,
      channelId,
      documentId,
      startedAt: Date.now(),
      expiresAt: Date.now() + this.typingTimeout
    };

    this.typingStates.set(id, typingState);

    logger.debug('Typing started', {
      userId,
      channelId,
      documentId
    });

    return typingState;
  }

  /**
   * Stop typing
   */
  stopTyping(userId: string, channelId: string): void {
    for (const [id, state] of this.typingStates.entries()) {
      if (state.userId === userId && state.channelId === channelId) {
        this.typingStates.delete(id);
        logger.debug('Typing stopped', { userId, channelId });
        break;
      }
    }
  }

  /**
   * Get typing users in channel
   */
  getTypingUsers(channelId: string): string[] {
    const typingUsers: Set<string> = new Set();
    const now = Date.now();

    for (const state of this.typingStates.values()) {
      if (state.channelId === channelId && state.expiresAt > now) {
        typingUsers.add(state.userId);
      }
    }

    return Array.from(typingUsers);
  }

  /**
   * Cleanup expired typing states
   */
  cleanupExpiredTyping(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [id, state] of this.typingStates.entries()) {
      if (state.expiresAt < now) {
        this.typingStates.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Set typing timeout
   */
  setTypingTimeout(timeoutMs: number): void {
    this.typingTimeout = timeoutMs;
    logger.debug('Typing timeout updated', { timeoutMs });
  }
}

// ==================== ACTIVITY MONITOR ====================

export class ActivityMonitor {
  private activityLog = new Map<string, ActivityLog[]>();
  private activityCount = 0;
  private maxLogSize = 1000;

  /**
   * Record activity
   */
  recordActivity(userId: string, action: string, context: Record<string, any>): ActivityLog {
    const id = 'activity-' + Date.now() + '-' + this.activityCount++;

    const log: ActivityLog = {
      id,
      userId,
      action,
      context,
      timestamp: Date.now()
    };

    const userLogs = this.activityLog.get(userId) || [];
    userLogs.push(log);

    // Keep only recent activities
    if (userLogs.length > this.maxLogSize) {
      userLogs.shift();
    }

    this.activityLog.set(userId, userLogs);

    logger.debug('Activity recorded', {
      userId,
      action,
      contextKeys: Object.keys(context)
    });

    return log;
  }

  /**
   * Get user activity
   */
  getUserActivity(userId: string, limit: number = 50): ActivityLog[] {
    const logs = this.activityLog.get(userId) || [];
    return logs.slice(-limit);
  }

  /**
   * Get activity by action type
   */
  getActivityByAction(userId: string, action: string, limit: number = 50): ActivityLog[] {
    const logs = this.activityLog.get(userId) || [];
    return logs
      .filter(log => log.action === action)
      .slice(-limit);
  }

  /**
   * Get recent activity across all users
   */
  getRecentActivity(limit: number = 100): ActivityLog[] {
    const allActivities: ActivityLog[] = [];

    for (const logs of this.activityLog.values()) {
      allActivities.push(...logs);
    }

    return allActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Clear user activity
   */
  clearUserActivity(userId: string): void {
    this.activityLog.delete(userId);
    logger.debug('User activity cleared', { userId });
  }
}

// ==================== STATUS TRACKER ====================

export class StatusTracker {
  private cursorPositions = new Map<string, CursorPosition>();
  private sessionMap = new Map<string, { userId: string; lastActive: number }>();
  private sessionCount = 0;

  /**
   * Track cursor position
   */
  trackCursorPosition(userId: string, documentId: string, x: number, y: number): CursorPosition {
    const position: CursorPosition = {
      userId,
      x,
      y,
      documentId,
      timestamp: Date.now()
    };

    this.cursorPositions.set(userId + '-' + documentId, position);

    logger.debug('Cursor position tracked', {
      userId,
      documentId,
      position: { x, y }
    });

    return position;
  }

  /**
   * Get document cursor positions
   */
  getDocumentCursors(documentId: string): CursorPosition[] {
    const cursors: CursorPosition[] = [];

    for (const position of this.cursorPositions.values()) {
      if (position.documentId === documentId) {
        cursors.push(position);
      }
    }

    return cursors;
  }

  /**
   * Create session
   */
  createSession(userId: string): string {
    const sessionId = 'session-' + Date.now() + '-' + this.sessionCount++;

    this.sessionMap.set(sessionId, {
      userId,
      lastActive: Date.now()
    });

    logger.debug('Session created', { sessionId, userId });

    return sessionId;
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId: string): void {
    const session = this.sessionMap.get(sessionId);
    if (session) {
      session.lastActive = Date.now();
    }
  }

  /**
   * Get user sessions
   */
  getUserSessions(userId: string): string[] {
    const sessions: string[] = [];

    for (const [sessionId, session] of this.sessionMap.entries()) {
      if (session.userId === userId) {
        sessions.push(sessionId);
      }
    }

    return sessions;
  }

  /**
   * End session
   */
  endSession(sessionId: string): void {
    this.sessionMap.delete(sessionId);
    logger.debug('Session ended', { sessionId });
  }

  /**
   * Cleanup idle sessions
   */
  cleanupIdleSessions(idleTimeMs: number = 3600000): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [sessionId, session] of this.sessionMap.entries()) {
      if (now - session.lastActive > idleTimeMs) {
        this.sessionMap.delete(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// ==================== EXPORTS ====================

export const presenceManager = new PresenceManager();
export const typingIndicator = new TypingIndicator();
export const activityMonitor = new ActivityMonitor();
export const statusTracker = new StatusTracker();
