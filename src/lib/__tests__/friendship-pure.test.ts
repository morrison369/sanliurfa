/**
 * Unit Tests — social/friendship.ts in-memory friendship graph (pure)
 *
 * - sendFriendRequest (status pending + duplicate throw)
 * - acceptFriendRequest (auth check + status pending → accepted)
 * - declineFriendRequest (requester or addressee yetkilendirme)
 * - removeFriendship (delete map entry)
 * - blockUser (existing → status blocked OR new entry)
 * - findFriendship (bidirectional lookup — swap order works)
 * - getFriends / getPendingRequests / getSentRequests / areFriends / isBlocked
 * - getFriendshipStatus / getFollowerCount / getFollowingCount
 * - getMutualFriends (Set intersection)
 * - searchUsers (mock list + name filter + friendshipStatus inject)
 *
 * In-memory Map state shared.
 */

import { describe, it, expect } from 'vitest';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriendship,
  blockUser,
  getFriends,
  getPendingRequests,
  getSentRequests,
  areFriends,
  isBlocked,
  getFriendshipStatus,
  getFollowerCount,
  getFollowingCount,
  getMutualFriends,
  searchUsers,
} from '../social/friendship';

const uniq = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('sendFriendRequest', () => {
  it('status pending + id + timestamps', () => {
    const u1 = uniq('u-send-1');
    const u2 = uniq('u-send-2');
    const f = sendFriendRequest(u1, u2);
    expect(f.status).toBe('pending');
    expect(f.id).toBeDefined();
    expect(f.requesterId).toBe(u1);
  });

  it('duplicate request → throw "already exists"', () => {
    const u1 = uniq('u-dup-1');
    const u2 = uniq('u-dup-2');
    sendFriendRequest(u1, u2);
    expect(() => sendFriendRequest(u1, u2)).toThrow(/already exists/);
  });

  it('reverse direction → "already exists" (bidirectional check)', () => {
    const u1 = uniq('u-rev-1');
    const u2 = uniq('u-rev-2');
    sendFriendRequest(u1, u2);
    expect(() => sendFriendRequest(u2, u1)).toThrow(/already exists/);
  });
});

describe('acceptFriendRequest', () => {
  it('status pending → accepted', () => {
    const u1 = uniq('u-acc-1');
    const u2 = uniq('u-acc-2');
    const f = sendFriendRequest(u1, u2);
    const accepted = acceptFriendRequest(f.id, u2);
    expect(accepted.status).toBe('accepted');
  });

  it('addressee olmayan user → throw Unauthorized', () => {
    const u1 = uniq('u-auth-1');
    const u2 = uniq('u-auth-2');
    const f = sendFriendRequest(u1, u2);
    expect(() => acceptFriendRequest(f.id, 'other-user')).toThrow(/Unauthorized/);
  });

  it('bilinmeyen friendship → throw not found', () => {
    expect(() => acceptFriendRequest('non-existent', 'u')).toThrow(/not found/);
  });

  it('zaten accepted → throw "Not pending"', () => {
    const u1 = uniq('u-na-1');
    const u2 = uniq('u-na-2');
    const f = sendFriendRequest(u1, u2);
    acceptFriendRequest(f.id, u2);
    expect(() => acceptFriendRequest(f.id, u2)).toThrow(/Not pending/);
  });
});

describe('declineFriendRequest', () => {
  it('addressee veya requester decline edebilir', () => {
    const u1 = uniq('u-dec-1');
    const u2 = uniq('u-dec-2');
    const f = sendFriendRequest(u1, u2);
    expect(declineFriendRequest(f.id, u2)).toBe(true);
  });

  it('üçüncü taraf → throw Unauthorized', () => {
    const u1 = uniq('u-3p-1');
    const u2 = uniq('u-3p-2');
    const f = sendFriendRequest(u1, u2);
    expect(() => declineFriendRequest(f.id, 'third-party')).toThrow(/Unauthorized/);
  });

  it('bilinmeyen id → false', () => {
    expect(declineFriendRequest('non-existent', 'u')).toBe(false);
  });
});

describe('removeFriendship', () => {
  it('Map entry silinir + true döner', () => {
    const u1 = uniq('u-rm-1');
    const u2 = uniq('u-rm-2');
    sendFriendRequest(u1, u2);
    expect(removeFriendship(u1, u2)).toBe(true);
  });

  it('bulunamayan → false', () => {
    expect(removeFriendship('a', 'b')).toBe(false);
  });
});

describe('blockUser', () => {
  it('mevcut friendship → status blocked', () => {
    const u1 = uniq('u-blk-1');
    const u2 = uniq('u-blk-2');
    sendFriendRequest(u1, u2);
    const blocked = blockUser(u1, u2);
    expect(blocked.status).toBe('blocked');
  });

  it('yeni → status blocked entry yaratılır', () => {
    const u1 = uniq('u-bnew-1');
    const u2 = uniq('u-bnew-2');
    const blocked = blockUser(u1, u2);
    expect(blocked.status).toBe('blocked');
    expect(blocked.requesterId).toBe(u1);
  });
});

describe('getFriends / getFollowerCount / getFollowingCount', () => {
  it('accepted friendship — getFriends iki yönlü', () => {
    const u1 = uniq('u-gf-1');
    const u2 = uniq('u-gf-2');
    const f = sendFriendRequest(u1, u2);
    acceptFriendRequest(f.id, u2);
    expect(getFriends(u1)).toContain(u2);
    expect(getFriends(u2)).toContain(u1);
  });

  it('getFollowerCount — addressee accepted ratio', () => {
    const u = uniq('u-fc-target');
    sendFriendRequest(uniq('u-fc-r'), u); // pending — count etmemeli
    const f2 = sendFriendRequest(uniq('u-fc-r2'), u);
    acceptFriendRequest(f2.id, u);
    expect(getFollowerCount(u)).toBeGreaterThanOrEqual(1);
  });

  it('getFollowingCount — requester accepted ratio', () => {
    const u = uniq('u-following');
    const f = sendFriendRequest(u, uniq('u-target-following'));
    acceptFriendRequest(f.id, f.addresseeId);
    expect(getFollowingCount(u)).toBe(1);
  });
});

describe('getPendingRequests / getSentRequests', () => {
  it('Pending — addressee perspective', () => {
    const u = uniq('u-pend');
    sendFriendRequest(uniq('u-from-1'), u);
    sendFriendRequest(uniq('u-from-2'), u);
    expect(getPendingRequests(u).length).toBeGreaterThanOrEqual(2);
  });

  it('Sent — requester perspective', () => {
    const u = uniq('u-sent');
    sendFriendRequest(u, uniq('u-target-1'));
    expect(getSentRequests(u).length).toBeGreaterThanOrEqual(1);
  });
});

describe('areFriends / isBlocked / getFriendshipStatus', () => {
  it('areFriends — accepted → true', () => {
    const u1 = uniq('u-af-1');
    const u2 = uniq('u-af-2');
    const f = sendFriendRequest(u1, u2);
    acceptFriendRequest(f.id, u2);
    expect(areFriends(u1, u2)).toBe(true);
    expect(areFriends(u2, u1)).toBe(true);
  });

  it('areFriends — pending → false', () => {
    const u1 = uniq('u-afp-1');
    const u2 = uniq('u-afp-2');
    sendFriendRequest(u1, u2);
    expect(areFriends(u1, u2)).toBe(false);
  });

  it('isBlocked — blocker → blocked direction matters', () => {
    const u1 = uniq('u-ib-1');
    const u2 = uniq('u-ib-2');
    blockUser(u1, u2);
    expect(isBlocked(u1, u2)).toBe(true);
    // Ters direction blocked değil (asymmetric)
    expect(isBlocked(u2, u1)).toBe(false);
  });

  it('getFriendshipStatus — yok → null', () => {
    expect(getFriendshipStatus('xyz', 'abc')).toBeNull();
  });
});

describe('getMutualFriends', () => {
  it('Set intersection — common friends', () => {
    const u1 = uniq('u-m-1');
    const u2 = uniq('u-m-2');
    const common = uniq('u-m-common');
    // u1 ↔ common, u2 ↔ common
    const f1 = sendFriendRequest(u1, common);
    acceptFriendRequest(f1.id, common);
    const f2 = sendFriendRequest(u2, common);
    acceptFriendRequest(f2.id, common);
    const mutual = getMutualFriends(u1, u2);
    expect(mutual).toContain(common);
  });
});

describe('searchUsers', () => {
  it('mock list filter — name includes case-insensitive', () => {
    const r = searchUsers('ahmet', 'cur-user');
    expect(r.some((u) => u.name.toLowerCase().includes('ahmet'))).toBe(true);
  });

  it('eşleşme yok → empty array', () => {
    expect(searchUsers('xyz-no-match', 'cur-user')).toEqual([]);
  });
});
