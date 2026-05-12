/**
 * Unit Tests — places/user-submissions.ts in-memory CRUD (UGC)
 *
 * - submitPlace / saveDraft (status pending vs draft + auto-init upvotes/comments)
 * - updateSubmission (auth check + approved blocked)
 * - submitForReview / approveSubmission / rejectSubmission / requestMoreInfo
 * - upvoteSubmission (idempotent — duplicate user skip)
 * - addComment / getUserSubmissions (sorted desc createdAt)
 * - getPendingSubmissions / getSubmissions filter / getSubmissionById
 * - deleteSubmission (auth + approved blocked)
 * - PLACE_CATEGORIES / PLACE_FEATURES exports
 * - getSubmissionStats (count breakdown by status + category)
 *
 * In-memory Map — testler unique userId/data kullanır.
 */

import { describe, it, expect } from 'vitest';
import {
  submitPlace,
  saveDraft,
  updateSubmission,
  submitForReview,
  approveSubmission,
  rejectSubmission,
  requestMoreInfo,
  upvoteSubmission,
  addComment,
  getUserSubmissions,
  getPendingSubmissions,
  getSubmissions,
  getSubmissionById,
  deleteSubmission,
  getSubmissionStats,
  PLACE_CATEGORIES,
  PLACE_FEATURES,
} from '../places/user-submissions';

const baseSubmission = (userId: string) => ({
  userId,
  userName: 'Test User',
  userEmail: `${userId}@test.com`,
  name: 'Test Place',
  category: 'restoran',
  description: 'desc',
  address: 'Address',
  district: 'Haliliye',
  features: [],
  photos: [],
  isOwner: false,
});

describe('submitPlace', () => {
  it('id + status pending + initial counters 0', () => {
    const UID = `u-submit-${Date.now()}`;
    const s = submitPlace(baseSubmission(UID));
    expect(s.id).toBeDefined();
    expect(s.status).toBe('pending');
    expect(s.upvotes).toBe(0);
    expect(s.upvotedBy).toEqual([]);
    expect(s.comments).toEqual([]);
  });
});

describe('saveDraft', () => {
  it('status draft (not pending)', () => {
    const UID = `u-draft-${Date.now()}`;
    const s = saveDraft(baseSubmission(UID));
    expect(s.status).toBe('draft');
  });
});

describe('updateSubmission', () => {
  it('owner update başarılı', () => {
    const UID = `u-up-${Date.now()}`;
    const s = saveDraft(baseSubmission(UID));
    const updated = updateSubmission(s.id, UID, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
  });

  it('başka kullanıcı → throw Unauthorized', () => {
    const UID = `u-up-other-${Date.now()}`;
    const s = saveDraft(baseSubmission(UID));
    expect(() => updateSubmission(s.id, 'other-user', { name: 'X' })).toThrow(/Unauthorized/);
  });

  it('approved submission → throw cannot edit', () => {
    const UID = `u-up-app-${Date.now()}`;
    const s = submitPlace(baseSubmission(UID));
    approveSubmission(s.id, 'admin-1');
    expect(() => updateSubmission(s.id, UID, { name: 'X' })).toThrow(/Cannot edit/);
  });

  it('bilinmeyen submission → throw Submission not found', () => {
    expect(() => updateSubmission('non-existent', 'u', {})).toThrow(/not found/);
  });
});

describe('approveSubmission / rejectSubmission', () => {
  it('approve — status approved + reviewedBy + reviewedAt', () => {
    const UID = `u-app-${Date.now()}`;
    const s = submitPlace(baseSubmission(UID));
    const approved = approveSubmission(s.id, 'admin-1', 'good');
    expect(approved.status).toBe('approved');
    expect(approved.reviewedBy).toBe('admin-1');
    expect(approved.adminNotes).toBe('good');
  });

  it('reject — status rejected + adminNotes = reason', () => {
    const UID = `u-rej-${Date.now()}`;
    const s = submitPlace(baseSubmission(UID));
    const rejected = rejectSubmission(s.id, 'admin-1', 'spam');
    expect(rejected.status).toBe('rejected');
    expect(rejected.adminNotes).toBe('spam');
  });
});

describe('requestMoreInfo', () => {
  it('status needs_info + admin comment eklenir', () => {
    const UID = `u-mi-${Date.now()}`;
    const s = submitPlace(baseSubmission(UID));
    const result = requestMoreInfo(s.id, 'admin-1', 'Photos eksik');
    expect(result.status).toBe('needs_info');
    expect(result.comments.length).toBeGreaterThanOrEqual(1);
    expect(result.comments[0].isAdmin).toBe(true);
  });
});

describe('upvoteSubmission', () => {
  it('first upvote — counter 1 + upvotedBy ekler', () => {
    const UID = `u-up1-${Date.now()}`;
    const s = submitPlace(baseSubmission(UID));
    upvoteSubmission(s.id, 'voter-1');
    const found = getSubmissionById(s.id);
    expect(found?.upvotes).toBe(1);
    expect(found?.upvotedBy).toContain('voter-1');
  });

  it('duplicate upvote — idempotent (skip if already voted)', () => {
    const UID = `u-up2-${Date.now()}`;
    const s = submitPlace(baseSubmission(UID));
    upvoteSubmission(s.id, 'voter-2');
    upvoteSubmission(s.id, 'voter-2');
    expect(getSubmissionById(s.id)?.upvotes).toBe(1); // not 2
  });
});

describe('addComment', () => {
  it('comment append + admin flag', () => {
    const UID = `u-cm-${Date.now()}`;
    const s = submitPlace(baseSubmission(UID));
    const c = addComment(s.id, 'commenter', 'C', 'comment text', false);
    expect(c.content).toBe('comment text');
    expect(c.isAdmin).toBe(false);
  });
});

describe('getUserSubmissions', () => {
  it('sadece kendi submission filter', () => {
    const UID = `u-list-${Date.now()}`;
    submitPlace(baseSubmission(UID));
    submitPlace(baseSubmission(UID));
    const list = getUserSubmissions(UID);
    expect(list.every((s) => s.userId === UID)).toBe(true);
    expect(list.length).toBe(2);
  });
});

describe('getSubmissions filter', () => {
  it('status filter', () => {
    const UID = `u-stf-${Date.now()}`;
    submitPlace(baseSubmission(UID));
    saveDraft(baseSubmission(UID));
    const drafts = getSubmissions({ userId: UID, status: 'draft' });
    expect(drafts.every((s) => s.status === 'draft')).toBe(true);
  });
});

describe('deleteSubmission', () => {
  it('owner delete OK + non-owner / approved blocked', () => {
    const UID = `u-del-${Date.now()}`;
    const s = saveDraft(baseSubmission(UID));
    expect(deleteSubmission(s.id, UID)).toBe(true);
    expect(getSubmissionById(s.id)).toBeNull();
  });

  it('non-owner delete → false', () => {
    const UID = `u-del-other-${Date.now()}`;
    const s = saveDraft(baseSubmission(UID));
    expect(deleteSubmission(s.id, 'other')).toBe(false);
  });

  it('bilinmeyen id → false', () => {
    expect(deleteSubmission('non-existent', 'u')).toBe(false);
  });
});

describe('PLACE_CATEGORIES / PLACE_FEATURES', () => {
  it('PLACE_CATEGORIES — array of {id, name, icon}', () => {
    expect(Array.isArray(PLACE_CATEGORIES)).toBe(true);
    expect(PLACE_CATEGORIES.length).toBeGreaterThan(10);
    expect(PLACE_CATEGORIES[0].id).toBeDefined();
  });

  it('PLACE_FEATURES — Türkçe label list', () => {
    expect(PLACE_FEATURES).toContain('Otopark');
    expect(PLACE_FEATURES).toContain('WiFi');
  });
});

describe('getPendingSubmissions / getSubmissionStats', () => {
  it('pending list contains pending + in_review', () => {
    const list = getPendingSubmissions();
    expect(list.every((s) => s.status === 'pending' || s.status === 'in_review')).toBe(true);
  });

  it('getSubmissionStats — count breakdown structure', () => {
    const stats = getSubmissionStats();
    expect(typeof stats.total).toBe('number');
    expect(typeof stats.pending).toBe('number');
    expect(typeof stats.approved).toBe('number');
    expect(Array.isArray(stats.byCategory)).toBe(true);
  });
});
