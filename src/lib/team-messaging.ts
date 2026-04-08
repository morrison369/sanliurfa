/**
 * Phase 115: Team Communication & Messaging
 * Advanced messaging with channels, threads, and rich formatting
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type ChannelType = 'public' | 'private' | 'direct';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  members: string[];
  owner: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  mentions: string[];
  formatting: Record<string, any>;
  reactions: Map<string, string[]>;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  editHistory: Array<{ content: string; timestamp: number }>;
}

export interface Thread {
  id: string;
  messageId: string;
  channelId: string;
  replies: Message[];
  createdAt: number;
  replyCount: number;
}

// ==================== CHANNEL MANAGER ====================

export class ChannelManager {
  private channels = new Map<string, Channel>();
  private channelCount = 0;

  /**
   * Create channel
   */
  createChannel(config: Omit<Channel, 'id' | 'createdAt' | 'updatedAt' | 'archived'>): Channel {
    const id = 'channel-' + Date.now() + '-' + this.channelCount++;

    const channel: Channel = {
      ...config,
      id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false
    };

    this.channels.set(id, channel);
    logger.info('Channel created', {
      channelId: id,
      name: config.name,
      type: config.type,
      owner: config.owner,
      memberCount: config.members.length
    });

    return channel;
  }

  /**
   * Get channel
   */
  getChannel(channelId: string): Channel | null {
    return this.channels.get(channelId) || null;
  }

  /**
   * Add member to channel
   */
  addMember(channelId: string, userId: string): void {
    const channel = this.channels.get(channelId);
    if (channel && !channel.members.includes(userId)) {
      channel.members.push(userId);
      channel.updatedAt = Date.now();
      logger.debug('Member added to channel', { channelId, userId });
    }
  }

  /**
   * Remove member from channel
   */
  removeMember(channelId: string, userId: string): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.members = channel.members.filter(m => m !== userId);
      channel.updatedAt = Date.now();
      logger.debug('Member removed from channel', { channelId, userId });
    }
  }

  /**
   * Get user channels
   */
  getUserChannels(userId: string): Channel[] {
    const userChannels: Channel[] = [];

    for (const channel of this.channels.values()) {
      if (channel.members.includes(userId) || channel.owner === userId) {
        userChannels.push(channel);
      }
    }

    return userChannels;
  }

  /**
   * Get channel members
   */
  getChannelMembers(channelId: string): string[] {
    const channel = this.channels.get(channelId);
    return channel?.members || [];
  }

  /**
   * Archive channel
   */
  archiveChannel(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.archived = true;
      channel.updatedAt = Date.now();
      logger.debug('Channel archived', { channelId });
    }
  }

  /**
   * List channels
   */
  listChannels(type?: ChannelType): Channel[] {
    const channels: Channel[] = [];

    for (const channel of this.channels.values()) {
      if (!type || channel.type === type) {
        channels.push(channel);
      }
    }

    return channels;
  }
}

// ==================== MESSAGE FORMATTER ====================

export class MessageFormatter {
  /**
   * Format message with mentions and formatting
   */
  formatMessage(content: string, mentions: string[] = [], formatting: Record<string, any> = {}): {
    content: string;
    mentions: string[];
    formatting: Record<string, any>;
  } {
    const sanitized = this.sanitizeContent(content);
    const extractedMentions = this.extractMentions(sanitized);
    const allMentions = Array.from(new Set([...mentions, ...extractedMentions]));

    logger.debug('Message formatted', {
      contentLength: sanitized.length,
      mentionCount: allMentions.length,
      formattingRules: Object.keys(formatting).length
    });

    return {
      content: sanitized,
      mentions: allMentions,
      formatting
    };
  }

  /**
   * Extract mentions from content
   */
  extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex) || [];
    return matches.map(m => m.substring(1));
  }

  /**
   * Sanitize content
   */
  private sanitizeContent(content: string): string {
    // Remove script tags and harmful content
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  /**
   * Apply formatting
   */
  applyFormatting(content: string, formatting: Record<string, any>): string {
    let formatted = content;

    if (formatting.bold) {
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }

    if (formatting.italic) {
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    if (formatting.code) {
      formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    }

    return formatted;
  }

  /**
   * Parse message with all formatting
   */
  parseMessage(content: string): {
    text: string;
    mentions: string[];
    hasLinks: boolean;
    hasCode: boolean;
  } {
    return {
      text: this.sanitizeContent(content),
      mentions: this.extractMentions(content),
      hasLinks: /https?:\/\//.test(content),
      hasCode: /`/.test(content)
    };
  }
}

// ==================== THREAD MANAGER ====================

export class ThreadManager {
  private threads = new Map<string, Thread>();
  private threadCount = 0;
  private messageThreads = new Map<string, string>();

  /**
   * Create thread from message
   */
  createThread(messageId: string, channelId: string): Thread {
    const id = 'thread-' + Date.now() + '-' + this.threadCount++;

    const thread: Thread = {
      id,
      messageId,
      channelId,
      replies: [],
      createdAt: Date.now(),
      replyCount: 0
    };

    this.threads.set(id, thread);
    this.messageThreads.set(messageId, id);

    logger.debug('Thread created', { threadId: id, messageId, channelId });

    return thread;
  }

  /**
   * Add reply to thread
   */
  addReply(threadId: string, message: Message): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.replies.push(message);
      thread.replyCount++;
      logger.debug('Reply added to thread', { threadId, messageId: message.id });
    }
  }

  /**
   * Get thread
   */
  getThread(threadId: string): Thread | null {
    return this.threads.get(threadId) || null;
  }

  /**
   * Get thread for message
   */
  getThreadForMessage(messageId: string): Thread | null {
    const threadId = this.messageThreads.get(messageId);
    return threadId ? this.threads.get(threadId) || null : null;
  }

  /**
   * Get thread replies
   */
  getThreadReplies(threadId: string): Message[] {
    const thread = this.threads.get(threadId);
    return thread?.replies || [];
  }

  /**
   * Get reply count
   */
  getReplyCount(threadId: string): number {
    const thread = this.threads.get(threadId);
    return thread?.replyCount || 0;
  }

  /**
   * Delete reply from thread
   */
  deleteReply(threadId: string, messageId: string): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.replies = thread.replies.filter(r => r.id !== messageId);
      thread.replyCount--;
      logger.debug('Reply deleted from thread', { threadId, messageId });
    }
  }
}

// ==================== MENTION RESOLVER ====================

export class MentionResolver {
  private userRegistry = new Map<string, { id: string; username: string; displayName: string }>();

  /**
   * Register user
   */
  registerUser(userId: string, username: string, displayName: string): void {
    this.userRegistry.set(userId, { id: userId, username, displayName });
    logger.debug('User registered for mentions', { userId, username });
  }

  /**
   * Resolve mention to user
   */
  resolveMention(mention: string): { id: string; username: string; displayName: string } | null {
    for (const user of this.userRegistry.values()) {
      if (user.username === mention || user.username.includes(mention)) {
        return user;
      }
    }

    return null;
  }

  /**
   * Get mention suggestions
   */
  getMentionSuggestions(prefix: string, limit: number = 10): Array<{ id: string; username: string; displayName: string }> {
    const suggestions: Array<{ id: string; username: string; displayName: string }> = [];

    for (const user of this.userRegistry.values()) {
      if (user.username.startsWith(prefix) || user.displayName.toLowerCase().includes(prefix.toLowerCase())) {
        suggestions.push(user);
        if (suggestions.length >= limit) break;
      }
    }

    return suggestions;
  }

  /**
   * Resolve all mentions in content
   */
  resolveAllMentions(content: string): Array<{ mention: string; user: { id: string; username: string; displayName: string } | null }> {
    const mentionRegex = /@(\w+)/g;
    const matches = content.matchAll(mentionRegex);
    const resolved: Array<{ mention: string; user: { id: string; username: string; displayName: string } | null }> = [];

    for (const match of matches) {
      const mention = match[1];
      const user = this.resolveMention(mention);
      resolved.push({ mention, user });
    }

    return resolved;
  }

  /**
   * Get all registered users
   */
  getAllUsers(): Array<{ id: string; username: string; displayName: string }> {
    return Array.from(this.userRegistry.values());
  }
}

// ==================== EXPORTS ====================

export const channelManager = new ChannelManager();
export const messageFormatter = new MessageFormatter();
export const threadManager = new ThreadManager();
export const mentionResolver = new MentionResolver();
