import { query } from '../postgres';

const statusMap: Record<string, string> = {
  new: 'open',
  read: 'in_progress',
  replied: 'resolved',
  archived: 'closed',
  open: 'open',
  in_progress: 'in_progress',
  resolved: 'resolved',
  closed: 'closed',
  spam: 'spam',
};

export function normalizeTicketStatus(status: string): string | null {
  return statusMap[status] || null;
}

export async function updateAdminMessageStatus(input: {
  id: string;
  status: string;
  adminId?: string | null;
}): Promise<{ success: true; status: string }> {
  const normalizedStatus = normalizeTicketStatus(input.status);
  if (!normalizedStatus) {
    throw new Error('status: open|in_progress|resolved|closed|spam olmalıdır.');
  }

  await query(
    `UPDATE support_tickets
     SET status = $1,
         assigned_to = COALESCE($2, assigned_to),
         resolved_at = CASE WHEN $1 IN ('resolved', 'closed') THEN NOW() ELSE resolved_at END,
         updated_at = NOW()
     WHERE id = $3`,
    [normalizedStatus, input.adminId || null, input.id],
  );

  return {
    success: true,
    status: normalizedStatus,
  };
}
