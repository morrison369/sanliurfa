import { query } from '../postgres';

export type ReviewModerationDecision = 'approve' | 'reject';

export async function moderateReview(input: {
  id: string;
  decision: ReviewModerationDecision;
  moderatorId?: string | null;
  rejectionReason?: string | null;
}): Promise<{ success: true; decision: ReviewModerationDecision }> {
  if (!input.id) {
    throw new Error('Yorum bilgisi eksik.');
  }

  if (input.decision === 'approve') {
    await query(
      `UPDATE reviews
       SET status = 'active',
           is_moderated = true,
           moderated_at = NOW(),
           moderated_by = $1
       WHERE id = $2`,
      [input.moderatorId || null, input.id],
    );

    return { success: true, decision: 'approve' };
  }

  await query(
    `UPDATE reviews
     SET status = 'rejected',
         is_moderated = true,
         moderated_at = NOW(),
         moderated_by = $1
     WHERE id = $2`,
    [input.moderatorId || null, input.id],
  );

  return { success: true, decision: 'reject' };
}
