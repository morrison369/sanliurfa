import type { APIRoute } from 'astro';
import { problemJson } from '../../../../lib/api';
import { requireAuth } from '../../../../lib/auth';
import { getConversationReadReceipts } from '../../../../lib/social/messaging-db';

export const GET: APIRoute = async ({ request, url }) => {
  const auth = await requireAuth(request).catch(() => null);
  if (!auth?.user) {
    return problemJson({
      status: 401,
      title: 'Unauthorized',
      detail: 'Giriş gerekli',
      type: '/problems/auth-required',
      instance: '/api/social/messages/receipts',
    });
  }

  const conversationId = url.searchParams.get('conversationId');
  if (!conversationId) {
    return problemJson({
      status: 400,
      title: 'Eksik Parametre',
      detail: 'conversationId zorunludur',
      type: '/problems/social-message-receipts-validation',
      instance: '/api/social/messages/receipts',
    });
  }

  try {
    const receipts = await getConversationReadReceipts(conversationId, auth.user.id);
    return new Response(
      JSON.stringify({
        success: true,
        conversationId,
        receipts,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemJson({
      status: 400,
      title: 'Read Receipt Alınamadı',
      detail: error instanceof Error ? error.message : 'receipt_fetch_failed',
      type: '/problems/social-message-receipts-failed',
      instance: '/api/social/messages/receipts',
    });
  }
};

