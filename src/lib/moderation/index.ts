/**
 * Content Moderation System
 * Automated and manual content moderation
 */

import { query } from '../postgres';
import { triggerWebhook } from '../webhooks';

export interface ModerationQueue {
  id: string;
  type: 'place' | 'review' | 'comment' | 'user';
  contentId: string;
  content: string;
  reason: string;
  reporter?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface ModerationRule {
  id: string;
  name: string;
  pattern: string;
  action: 'flag' | 'block' | 'auto_reject';
  severity: 'low' | 'medium' | 'high';
}

// Forbidden words pattern (Turkish profanity — matched via regex in HIGH_SEVERITY_PATTERNS)
const FORBIDDEN_WORDS: string[] = [];

// High severity spam patterns (auto-reject)
const HIGH_SEVERITY_PATTERNS = [
  /\b(viagra|cialis|casino|porno|sex|xxx|adult)\b/i,
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit cards
];

// Medium severity spam patterns (flag for review)
const SPAM_PATTERNS = [
  /https?:\/\/[^\s]*(click|win|prize|free)/i,
];

/**
 * Check content for violations
 */
export async function checkContent(
  content: string,
  _type: 'place' | 'review' | 'comment'
): Promise<{
  clean: boolean;
  violations: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
}> {
  const violations: string[] = [];
  let maxSeverity: 'none' | 'low' | 'medium' | 'high' = 'none';

  // Check forbidden words
  const lowerContent = content.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    if (lowerContent.includes(word.toLowerCase())) {
      violations.push(`Yasak kelime: ${word}`);
      maxSeverity = 'high';
    }
  }

  // Check high severity spam patterns
  for (const pattern of HIGH_SEVERITY_PATTERNS) {
    if (pattern.test(content)) {
      violations.push('Yasaklı içerik tespit edildi');
      maxSeverity = 'high';
    }
  }

  // Check medium severity spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      violations.push('Spam içerik tespit edildi');
      maxSeverity = maxSeverity === 'high' ? 'high' : 'medium';
    }
  }

  // Check for excessive caps (including Turkish uppercase)
  const turkishUpper = /[A-ZİŞĞÜÖÇÂ]/g;
  const capsRatio = (content.match(turkishUpper) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 10) {
    violations.push('Aşırı büyük harf kullanımı');
    maxSeverity = maxSeverity === 'high' ? 'high' : 'low';
  }

  // Check for excessive repetition
  const words = content.toLowerCase().split(/\s+/);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  
  for (const [word, count] of wordCounts) {
    if (count > 5 && word.length > 2) {
      violations.push(`Kelime tekrarı: "${word}"`);
      maxSeverity = maxSeverity === 'high' ? 'high' : 'low';
      break;
    }
  }

  return {
    clean: violations.length === 0,
    violations,
    severity: maxSeverity,
  };
}

/**
 * Submit content for moderation
 */
export async function submitForModeration(
  type: 'place' | 'review' | 'comment' | 'user',
  contentId: string,
  _content: string,
  reason?: string,
  _reporterId?: string
): Promise<void> {
  await query(
    `INSERT INTO moderation_queue (content_type, content_id, reason, status, created_at)
     VALUES ($1, $2, $3, 'pending', NOW())
     ON CONFLICT (content_type, content_id) DO NOTHING`,
    [type, contentId, reason || 'Otomatik tespit']
  );

  // Notify admins
  await triggerWebhook('moderation.new', {
    type,
    contentId,
    reason: reason || 'Otomatik tespit',
  });
}

/**
 * Auto-moderate content
 */
export async function autoModerate(
  content: string,
  contentId: string,
  type: 'place' | 'review' | 'comment',
  _userId: string
): Promise<{ approved: boolean; reason?: string }> {
  const check = await checkContent(content, type);

  if (check.severity === 'high') {
    // Auto-reject high severity
    await submitForModeration(type, contentId, content, 'Otomatik reddedildi: ' + check.violations.join(', '));
    return { approved: false, reason: 'İçerik kurallara aykırı' };
  }

  if (check.severity === 'medium') {
    // Flag for manual review
    await submitForModeration(type, contentId, content, 'Manuel inceleme gerekli: ' + check.violations.join(', '));
    // Still approve but flagged
    return { approved: true };
  }

  return { approved: true };
}

/**
 * Get moderation queue
 */
export async function getModerationQueue(
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
  limit = 50
): Promise<ModerationQueue[]> {
  let sql = `SELECT * FROM moderation_queue`;
  const params: any[] = [];

  if (status !== 'all') {
    sql += ` WHERE status = $1`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await query(sql, params);

  return result.rows.map(row => ({
    id: row.id,
    type: row.type,
    contentId: row.content_id,
    content: row.content,
    reason: row.reason,
    reporter: row.reporter_id,
    status: row.status,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Approve content
 */
export async function approveContent(
  queueId: string,
  moderatorId: string
): Promise<void> {
  const result = await query(
    `UPDATE moderation_queue
     SET status = 'resolved', moderator_id = $2, moderated_at = NOW()
     WHERE id = $1
     RETURNING content_type as type, content_id`,
    [queueId, moderatorId]
  );

  if (result.rows.length > 0) {
    const { type, content_id } = result.rows[0];
    
    // Update actual content status — use table-specific approved value
    const tableMap: Record<string, { table: string; status: string }> = {
      place:   { table: 'places',        status: 'active' },
      review:  { table: 'reviews',       status: 'active' },
      comment: { table: 'blog_comments', status: 'approved' },
      user:    { table: 'users',         status: 'active' },
    };

    const mapping = tableMap[type];
    if (mapping) {
      await query(
        `UPDATE ${mapping.table} SET status = '${mapping.status}' WHERE id = $1`,
        [content_id]
      );
    }
  }
}

/**
 * Reject content
 */
export async function rejectContent(
  queueId: string,
  moderatorId: string,
  rejectReason: string
): Promise<void> {
  const result = await query(
    `UPDATE moderation_queue
     SET status = 'resolved', moderator_id = $2, moderated_at = NOW(), reject_reason = $3
     WHERE id = $1
     RETURNING content_type as type, content_id`,
    [queueId, moderatorId, rejectReason]
  );

  if (result.rows.length > 0) {
    const { type, content_id } = result.rows[0];

    const tableMap: Record<string, string> = {
      place: 'places',
      review: 'reviews',
      comment: 'blog_comments',
      user: 'users',
    };

    if (tableMap[type]) {
      await query(
        `UPDATE ${tableMap[type]} SET status = 'rejected' WHERE id = $1`,
        [content_id]
      );
    }
  }
}

/**
 * Report content (alias for submitReport)
 */
export async function reportContent(
  type: 'place' | 'review' | 'comment' | 'user',
  contentId: string,
  reason: string,
  reporterId: string
): Promise<void> {
  // Get content
  let content = '';
  
  if (type === 'place') {
    const result = await query('SELECT name, description FROM places WHERE id = $1', [contentId]);
    content = result.rows[0]?.name + ' - ' + result.rows[0]?.description;
  } else if (type === 'review') {
    const result = await query('SELECT content FROM reviews WHERE id = $1', [contentId]);
    content = result.rows[0]?.content;
  } else if (type === 'comment') {
    const result = await query('SELECT content FROM blog_comments WHERE id = $1', [contentId]);
    content = result.rows[0]?.content;
  }

  await submitForModeration(type, contentId, content, reason, reporterId);

  // Create notification for user if content is rejected
  await query(
    `INSERT INTO content_reports (type, content_id, reason, reporter_id, status, created_at)
     VALUES ($1, $2, $3, $4, 'open', NOW())`,
    [type, contentId, reason, reporterId]
  );
}

/**
 * Submit report (alias for reportContent)
 */
export async function submitReport(
  type: 'place' | 'review' | 'comment' | 'user',
  contentId: string,
  reason: string,
  reporterId: string
): Promise<void> {
  // Get content
  let content = '';
  
  if (type === 'place') {
    const result = await query('SELECT name, description FROM places WHERE id = $1', [contentId]);
    content = result.rows[0]?.name + ' - ' + result.rows[0]?.description;
  } else if (type === 'review') {
    const result = await query('SELECT content FROM reviews WHERE id = $1', [contentId]);
    content = result.rows[0]?.content;
  } else if (type === 'comment') {
    const result = await query('SELECT content FROM blog_comments WHERE id = $1', [contentId]);
    content = result.rows[0]?.content;
  }

  await submitForModeration(type, contentId, content, reason, reporterId);

  // Create notification for user if content is rejected
  await query(
    `INSERT INTO content_reports (type, content_id, reason, reporter_id, status, created_at)
     VALUES ($1, $2, $3, $4, 'open', NOW())`,
    [type, contentId, reason, reporterId]
  );
}

/**
 * Get moderation stats
 */
export async function getModerationStats(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  avgProcessTime: number;
}> {
  const result = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'resolved') as approved,
      0 as rejected,
      AVG(EXTRACT(EPOCH FROM (moderated_at - created_at))) as avg_process_time
    FROM moderation_queue
    WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
  `);

  return {
    pending: parseInt(result.rows[0].pending, 10),
    approved: parseInt(result.rows[0].approved, 10),
    rejected: parseInt(result.rows[0].rejected, 10),
    avgProcessTime: Math.round(parseFloat(result.rows[0].avg_process_time) / 60) || 0, // minutes
  };
}

// ============================================
// Additional functions for API routes
// ============================================

export interface ModerationAction {
  id: string;
  reportId: string;
  targetUserId: string;
  actionType: 'warning' | 'content_removed' | 'suspend' | 'ban' | 'appeal_granted';
  reason: string;
  moderatorId: string;
  durationDays?: number;
  createdAt: Date;
}

export interface BanHistory {
  id: string;
  userId: string;
  action: string;
  reason: string;
  moderatorId: string;
  durationDays?: number;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

/**
 * Take moderation action on a user or content
 */
export async function takeModerationAction(
  reportId: string,
  targetUserId: string,
  actionType: 'warning' | 'content_removed' | 'suspend' | 'ban' | 'appeal_granted',
  reason: string,
  moderatorId: string,
  durationDays?: number
): Promise<ModerationAction> {
  // Record the action
  const result = await query(
    `INSERT INTO moderation_actions (report_id, target_user_id, action_type, reason, moderator_id, duration_days, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [reportId, targetUserId, actionType, reason, moderatorId, durationDays]
  );

  const action = result.rows[0];

  // Apply action to user
  switch (actionType) {
    case 'ban':
      await query(
        `UPDATE users SET 
          is_banned = true, 
          ban_reason = $2, 
          banned_at = NOW(), 
          ban_expires_at = CASE WHEN $3 > 0 THEN NOW() + INTERVAL '1 day' * $3 ELSE NULL END
        WHERE id = $1`,
        [targetUserId, reason, durationDays || 0]
      );
      break;
    case 'suspend':
      await query(
        `UPDATE users SET is_suspended = true, suspension_reason = $2 WHERE id = $1`,
        [targetUserId, reason]
      );
      break;
    case 'warning':
      await query(
        `INSERT INTO notifications (user_id, type, title, message, created_at)
         VALUES ($1, 'warning', 'Uyarı Aldınız', $2, NOW())`,
        [targetUserId, reason]
      );
      break;
  }

  return {
    id: action.id,
    reportId: action.report_id,
    targetUserId: action.target_user_id,
    actionType: action.action_type,
    reason: action.reason,
    moderatorId: action.moderator_id,
    durationDays: action.duration_days,
    createdAt: new Date(action.created_at),
  };
}

/**
 * Get user ban history
 */
export async function getUserBanHistory(userId: string): Promise<BanHistory[]> {
  const result = await query(
    `SELECT * FROM moderation_actions 
     WHERE target_user_id = $1 
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.target_user_id,
    action: row.action_type,
    reason: row.reason,
    moderatorId: row.moderator_id,
    durationDays: row.duration_days,
    createdAt: new Date(row.created_at),
    ...(row.expires_at ? { expiresAt: new Date(row.expires_at) } : {}),
    isActive: row.is_active ?? false,
  }));
}

/**
 * Check if user is banned
 */
export async function isUserBanned(userId: string): Promise<{ banned: boolean; reason?: string; expiresAt?: Date }> {
  const result = await query(
    `SELECT is_banned, ban_reason, ban_expires_at 
     FROM users 
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { banned: false };
  }

  const user = result.rows[0];
  
  // Check if ban has expired
  if (user.is_banned && user.ban_expires_at && new Date(user.ban_expires_at) < new Date()) {
    // Auto-unban
    await query(
      `UPDATE users SET is_banned = false, ban_reason = NULL, banned_at = NULL, ban_expires_at = NULL WHERE id = $1`,
      [userId]
    );
    return { banned: false };
  }

  return {
    banned: user.is_banned,
    ...(user.ban_reason ? { reason: user.ban_reason } : {}),
    ...(user.ban_expires_at ? { expiresAt: new Date(user.ban_expires_at) } : {}),
  };
}

/**
 * Get reports (alias for getModerationQueue for API compatibility)
 */
export async function getReports(
  status: 'open' | 'investigating' | 'resolved' | 'dismissed' | 'all' = 'open',
  page = 1,
  limit = 50
): Promise<any[]> {
  const offset = (page - 1) * limit;
  
  let sql = `SELECT * FROM content_reports`;
  const params: any[] = [];
  
  if (status !== 'all') {
    sql += ` WHERE status = $1`;
    params.push(status);
  }
  
  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const result = await query(sql, params);
  
  return result.rows.map(row => ({
    id: row.id,
    type: row.type,
    contentId: row.content_id,
    reason: row.reason,
    reporterId: row.reporter_id,
    status: row.status,
    moderatorNotes: row.moderator_notes,
    createdAt: new Date(row.created_at),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
  }));
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  status: 'open' | 'investigating' | 'resolved' | 'dismissed',
  _moderatorId: string,
  notes?: string
): Promise<void> {
  await query(
    `UPDATE content_reports 
     SET status = $1, 
         moderator_notes = COALESCE($2, moderator_notes),
         resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN NOW() ELSE resolved_at END
     WHERE id = $3`,
    [status, notes, reportId]
  );
}
