export type PlaceStatus =
  | 'draft'
  | 'pending'
  | 'verified'
  | 'featured'
  | 'archived'
  | 'needs_info'
  | 'active'
  | 'rejected'
  | 'suspended'
  | 'deleted';

type ActorRole = 'user' | 'vendor' | 'moderator' | 'admin';

type TransitionRules = Record<PlaceStatus, PlaceStatus[]>;

const USER_RULES: TransitionRules = {
  draft: ['pending'],
  pending: [],
  verified: [],
  featured: [],
  archived: [],
  needs_info: ['pending'],
  active: [],
  rejected: [],
  suspended: [],
  deleted: [],
};

const ADMIN_RULES: TransitionRules = {
  draft: ['pending', 'verified', 'active', 'rejected', 'deleted'],
  pending: ['verified', 'active', 'rejected', 'needs_info', 'deleted', 'suspended'],
  verified: ['featured', 'active', 'archived', 'suspended', 'deleted'],
  featured: ['verified', 'active', 'archived', 'suspended', 'deleted'],
  archived: ['verified', 'active', 'deleted'],
  needs_info: ['pending', 'verified', 'active', 'rejected', 'deleted'],
  active: ['featured', 'verified', 'archived', 'suspended', 'deleted'],
  rejected: ['pending', 'verified', 'active', 'deleted'],
  suspended: ['verified', 'active', 'archived', 'deleted'],
  deleted: [],
};

function getRules(role: ActorRole): TransitionRules {
  return role === 'admin' || role === 'moderator' ? ADMIN_RULES : USER_RULES;
}

export function canTransitionPlaceStatus(
  currentStatus: string,
  nextStatus: string,
  actorRole: ActorRole,
): boolean {
  const current = (currentStatus || '').toLowerCase() as PlaceStatus;
  const next = (nextStatus || '').toLowerCase() as PlaceStatus;
  const rules = getRules(actorRole);
  if (!rules[current]) return false;
  return rules[current].includes(next);
}

export function assertPlaceStatusTransition(
  currentStatus: string,
  nextStatus: string,
  actorRole: ActorRole,
): { ok: true } | { ok: false; error: string } {
  if (canTransitionPlaceStatus(currentStatus, nextStatus, actorRole)) return { ok: true };
  return {
    ok: false,
    error: `Geçersiz durum geçişi: ${currentStatus} -> ${nextStatus} (${actorRole})`,
  };
}
