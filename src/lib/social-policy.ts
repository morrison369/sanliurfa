import { isUserBlocked } from './blocking';
import { allowsMessages } from './privacy';
import { queryOne } from './postgres';

export type SocialPolicyCode =
  | 'ok'
  | 'self_action'
  | 'target_not_found'
  | 'blocked_by_target'
  | 'you_blocked_target'
  | 'messages_disabled';

export interface SocialPolicyResult {
  allowed: boolean;
  code: SocialPolicyCode;
  message: string;
}

async function userExists(userId: string): Promise<boolean> {
  const user = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = $1', [userId]);
  return Boolean(user?.id);
}

export async function canFollowUser(followerId: string, targetUserId: string): Promise<SocialPolicyResult> {
  if (followerId === targetUserId) {
    return { allowed: false, code: 'self_action', message: 'Kullanıcı kendini takip edemez.' };
  }

  if (!(await userExists(targetUserId))) {
    return { allowed: false, code: 'target_not_found', message: 'Takip edilecek kullanıcı bulunamadı.' };
  }

  if (await isUserBlocked(targetUserId, followerId)) {
    return { allowed: false, code: 'blocked_by_target', message: 'Bu kullanıcı sizi engellediği için takip edemezsiniz.' };
  }

  if (await isUserBlocked(followerId, targetUserId)) {
    return { allowed: false, code: 'you_blocked_target', message: 'Engellediğiniz kullanıcıyı takip etmeden önce engeli kaldırın.' };
  }

  return { allowed: true, code: 'ok', message: 'Uygun' };
}

export async function canStartConversation(senderId: string, recipientId: string): Promise<SocialPolicyResult> {
  if (senderId === recipientId) {
    return { allowed: false, code: 'self_action', message: 'Kendinize mesaj başlatamazsınız.' };
  }

  if (!(await userExists(recipientId))) {
    return { allowed: false, code: 'target_not_found', message: 'Mesaj gönderilecek kullanıcı bulunamadı.' };
  }

  if (await isUserBlocked(recipientId, senderId)) {
    return { allowed: false, code: 'blocked_by_target', message: 'Bu kullanıcı size mesaj kabul etmiyor.' };
  }

  if (await isUserBlocked(senderId, recipientId)) {
    return { allowed: false, code: 'you_blocked_target', message: 'Engellediğiniz kullanıcıya mesaj gönderemezsiniz.' };
  }

  const recipientAllowsMessages = await allowsMessages(recipientId);
  if (!recipientAllowsMessages) {
    return { allowed: false, code: 'messages_disabled', message: 'Kullanıcı mesaj alımını kapatmış.' };
  }

  return { allowed: true, code: 'ok', message: 'Uygun' };
}
