/**
 * Social Graph - Friendship System
 * Follow/Unfollow, friend requests, social connections
 */

import { generateId } from '../utils';

// Friendship status
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked' | 'declined';

// Friendship record
export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

// User with friendship status
export interface UserWithFriendship {
  id: string;
  name: string;
  avatar?: string;
  friendshipStatus?: FriendshipStatus;
  isFollowing?: boolean;
  followersCount: number;
  followingCount: number;
}

// In-memory store (use DB in production)
const friendships: Map<string, Friendship> = new Map();

/**
 * Send friend request
 */
export function sendFriendRequest(requesterId: string, addresseeId: string): Friendship {
  // Check if already friends or pending
  const existing = findFriendship(requesterId, addresseeId);
  if (existing) {
    throw new Error('Friendship already exists');
  }

  const friendship: Friendship = {
    id: generateId(),
    requesterId,
    addresseeId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  friendships.set(friendship.id, friendship);
  
  // Create notification
  // notifications.friendRequest(addresseeId, requesterId);
  
  return friendship;
}

/**
 * Accept friend request
 */
export function acceptFriendRequest(friendshipId: string, userId: string): Friendship {
  const friendship = friendships.get(friendshipId);
  if (!friendship) throw new Error('Friendship not found');
  if (friendship.addresseeId !== userId) throw new Error('Unauthorized');
  if (friendship.status !== 'pending') throw new Error('Not pending');

  friendship.status = 'accepted';
  friendship.updatedAt = new Date().toISOString();
  
  return friendship;
}

/**
 * Decline or cancel friend request
 */
export function declineFriendRequest(friendshipId: string, userId: string): boolean {
  const friendship = friendships.get(friendshipId);
  if (!friendship) return false;
  if (friendship.addresseeId !== userId && friendship.requesterId !== userId) {
    throw new Error('Unauthorized');
  }

  friendship.status = 'declined';
  friendship.updatedAt = new Date().toISOString();
  return true;
}

/**
 * Remove friendship/unfollow
 */
export function removeFriendship(userId: string, friendId: string): boolean {
  const friendship = findFriendship(userId, friendId);
  if (!friendship) return false;
  
  friendships.delete(friendship.id);
  return true;
}

/**
 * Block user
 */
export function blockUser(blockerId: string, blockedId: string): Friendship {
  const existing = findFriendship(blockerId, blockedId);
  
  if (existing) {
    existing.status = 'blocked';
    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  const friendship: Friendship = {
    id: generateId(),
    requesterId: blockerId,
    addresseeId: blockedId,
    status: 'blocked',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  friendships.set(friendship.id, friendship);
  return friendship;
}

/**
 * Find friendship between two users
 */
function findFriendship(userId1: string, userId2: string): Friendship | null {
  for (const f of friendships.values()) {
    if (
      (f.requesterId === userId1 && f.addresseeId === userId2) ||
      (f.requesterId === userId2 && f.addresseeId === userId1)
    ) {
      return f;
    }
  }
  return null;
}

/**
 * Get user's friends
 */
export function getFriends(userId: string): string[] {
  const friends: string[] = [];
  
  for (const f of friendships.values()) {
    if (f.status === 'accepted') {
      if (f.requesterId === userId) friends.push(f.addresseeId);
      else if (f.addresseeId === userId) friends.push(f.requesterId);
    }
  }
  
  return friends;
}

/**
 * Get pending friend requests
 */
export function getPendingRequests(userId: string): Friendship[] {
  return Array.from(friendships.values()).filter(
    f => f.addresseeId === userId && f.status === 'pending'
  );
}

/**
 * Get sent friend requests
 */
export function getSentRequests(userId: string): Friendship[] {
  return Array.from(friendships.values()).filter(
    f => f.requesterId === userId && f.status === 'pending'
  );
}

/**
 * Check if users are friends
 */
export function areFriends(userId1: string, userId2: string): boolean {
  const f = findFriendship(userId1, userId2);
  return f?.status === 'accepted';
}

/**
 * Check if blocked
 */
export function isBlocked(blockerId: string, blockedId: string): boolean {
  const f = findFriendship(blockerId, blockedId);
  return f?.status === 'blocked' && f.requesterId === blockerId;
}

/**
 * Get friendship status
 */
export function getFriendshipStatus(userId1: string, userId2: string): FriendshipStatus | null {
  const f = findFriendship(userId1, userId2);
  return f?.status || null;
}

/**
 * Get follower count
 */
export function getFollowerCount(userId: string): number {
  let count = 0;
  for (const f of friendships.values()) {
    if (f.addresseeId === userId && f.status === 'accepted') count++;
  }
  return count;
}

/**
 * Get following count
 */
export function getFollowingCount(userId: string): number {
  let count = 0;
  for (const f of friendships.values()) {
    if (f.requesterId === userId && f.status === 'accepted') count++;
  }
  return count;
}

/**
 * Get mutual friends
 */
export function getMutualFriends(userId1: string, userId2: string): string[] {
  const friends1 = new Set(getFriends(userId1));
  const friends2 = getFriends(userId2);
  
  return friends2.filter(f => friends1.has(f));
}

/**
 * Search users (simplified)
 */
export function searchUsers(query: string, currentUserId: string): UserWithFriendship[] {
  // In production, search database
  // Mock implementation
  const mockUsers: UserWithFriendship[] = [
    { id: 'user_1', name: 'Ahmet Yılmaz', followersCount: 150, followingCount: 80 },
    { id: 'user_2', name: 'Ayşe Demir', followersCount: 230, followingCount: 120 },
  ];
  
  return mockUsers
    .filter(u => u.name.toLowerCase().includes(query.toLowerCase()))
    .map(u => ({
      ...u,
      ...(getFriendshipStatus(currentUserId, u.id)
        ? { friendshipStatus: getFriendshipStatus(currentUserId, u.id) as FriendshipStatus }
        : {}),
    }));
}
