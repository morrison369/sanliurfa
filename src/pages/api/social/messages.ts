/**
 * GET /api/social/messages
 * GET messages in a conversation
 * 
 * POST /api/social/messages
 * Send a message
 */

import type { APIRoute } from 'astro';
import {
  getMessages, 
  sendMessage, 
  getUserConversations, 
  getOrCreateConversation,
  editMessage,
  deleteMessage,
  getTotalUnreadCount,
  markConversationRead,
  setConversationTyping,
  getConversationTypingUsers,
  sharePlace,
  shareLocation
} from '../../../lib/social/messaging-db';
import { requireAuth } from '../../../lib/auth';
import { auditSiteChange } from '../../../lib/site-content';
import { problemJson } from '../../../lib/api';
import { buildSocialAuditContext, enforceSocialAction } from '../../../lib/social/request-guard';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş gerekli',
        type: '/problems/auth-required',
        instance: '/api/social/messages',
      });
    }

    const searchParams = url.searchParams;
    const conversationId = searchParams.get('conversationId');
    const type = searchParams.get('type');

    // Get all conversations
    if (type === 'conversations' || !conversationId) {
      const conversations = await getUserConversations(auth.user.id);
      const unreadCount = await getTotalUnreadCount(auth.user.id);
      
      return new Response(JSON.stringify({ conversations, unreadCount }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get messages in conversation
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before') || undefined;
    const after = searchParams.get('after') || undefined;

    const messages = await getMessages(conversationId, auth.user.id, { limit, before, after });

    return new Response(
      JSON.stringify({
        messages,
        typingUsers: getConversationTypingUsers(conversationId, auth.user.id),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get messages';
    return problemJson({
      status: 500,
      title: 'Mesajlar Alınamadı',
      detail: message,
      type: '/problems/social-messages-fetch-failed',
      instance: '/api/social/messages',
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Giriş gerekli',
        type: '/problems/auth-required',
        instance: '/api/social/messages',
      });
    }
    const auditCtx = buildSocialAuditContext({ request } as any, auth.user as any);
    const guardResponse = await enforceSocialAction(
      { request } as any,
      auth.user as any,
      'social.messages',
      'message_write',
    );
    if (guardResponse) return guardResponse;

    const body = await request.json();
    const { 
      conversationId, 
      recipientId, 
      content, 
      type = 'text',
      metadata,
      action 
    } = body;

    // Handle different actions
    if (action === 'edit') {
      const { messageId, newContent } = body;
      if (!messageId || !newContent) {
        await auditSiteChange('social.messages', 'social_abuse', auditCtx, {
          reason: 'edit_missing_fields',
          hasMessageId: Boolean(messageId),
          hasNewContent: Boolean(newContent),
        });
        return problemJson({
          status: 400,
          title: 'Eksik Parametre',
          detail: 'messageId ve newContent zorunludur',
          type: '/problems/social-message-edit-validation',
          instance: '/api/social/messages',
        });
      }
      const message = await editMessage(messageId, auth.user.id, newContent);
      return new Response(
        JSON.stringify({ success: true, message }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const { messageId } = body;
      if (!messageId) {
        await auditSiteChange('social.messages', 'social_abuse', auditCtx, {
          reason: 'delete_missing_message_id',
        });
        return problemJson({
          status: 400,
          title: 'Eksik Parametre',
          detail: 'messageId zorunludur',
          type: '/problems/social-message-delete-validation',
          instance: '/api/social/messages',
        });
      }
      await deleteMessage(messageId, auth.user.id);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }


    if (action === 'markRead') {
      const { conversationId: readConversationId } = body;
      if (!readConversationId) {
        return problemJson({
          status: 400,
          title: 'Eksik Parametre',
          detail: 'conversationId zorunludur',
          type: '/problems/social-message-mark-read-validation',
          instance: '/api/social/messages',
        });
      }
      const updatedCount = await markConversationRead(readConversationId, auth.user.id);
      const unreadCount = await getTotalUnreadCount(auth.user.id);
      return new Response(
        JSON.stringify({ success: true, updatedCount, unreadCount }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'typing') {
      const { conversationId: typingConversationId, isTyping } = body;
      if (!typingConversationId || typeof isTyping !== 'boolean') {
        return problemJson({
          status: 400,
          title: 'Eksik Parametre',
          detail: 'conversationId ve isTyping(boolean) zorunludur',
          type: '/problems/social-message-typing-validation',
          instance: '/api/social/messages',
        });
      }
      await setConversationTyping(typingConversationId, auth.user.id, isTyping);
      return new Response(
        JSON.stringify({
          success: true,
          conversationId: typingConversationId,
          isTyping,
          typingUsers: getConversationTypingUsers(typingConversationId, auth.user.id),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sharePlace') {
      const { placeId, placeName, message: placeMessage } = body;
      if (!conversationId || !placeId || !placeName) {
        await auditSiteChange('social.messages', 'social_abuse', auditCtx, {
          reason: 'share_place_missing_fields',
          hasConversationId: Boolean(conversationId),
          hasPlaceId: Boolean(placeId),
          hasPlaceName: Boolean(placeName),
        });
        return problemJson({
          status: 400,
          title: 'Eksik Parametre',
          detail: 'conversationId, placeId ve placeName zorunludur',
          type: '/problems/social-message-share-place-validation',
          instance: '/api/social/messages',
        });
      }
      const message = await sharePlace(conversationId, auth.user.id, placeId, placeName, placeMessage);
      return new Response(
        JSON.stringify({ success: true, message }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'shareLocation') {
      const { latitude, longitude, locationMessage } = body;
      if (!conversationId || latitude === undefined || longitude === undefined) {
        await auditSiteChange('social.messages', 'social_abuse', auditCtx, {
          reason: 'share_location_missing_fields',
          hasConversationId: Boolean(conversationId),
          hasLatitude: latitude !== undefined,
          hasLongitude: longitude !== undefined,
        });
        return problemJson({
          status: 400,
          title: 'Eksik Parametre',
          detail: 'conversationId, latitude ve longitude zorunludur',
          type: '/problems/social-message-share-location-validation',
          instance: '/api/social/messages',
        });
      }
      const message = await shareLocation(conversationId, auth.user.id, latitude, longitude, locationMessage);
      return new Response(
        JSON.stringify({ success: true, message }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Start new conversation or send to existing
    let convId = conversationId;
    
    if (!convId && recipientId) {
      const conversation = await getOrCreateConversation(auth.user.id, recipientId);
      convId = conversation.id;
    }

    if (!convId) {
      await auditSiteChange('social.messages', 'social_abuse', auditCtx, {
        reason: 'missing_conversation_or_recipient',
      });
      return problemJson({
        status: 400,
        title: 'Eksik Parametre',
        detail: 'conversationId veya recipientId zorunludur',
        type: '/problems/social-message-conversation-validation',
        instance: '/api/social/messages',
      });
    }

    if (!content) {
      await auditSiteChange('social.messages', 'social_abuse', auditCtx, {
        reason: 'missing_content',
        action,
      });
      return problemJson({
        status: 400,
        title: 'Eksik Parametre',
        detail: 'content zorunludur',
        type: '/problems/social-message-content-validation',
        instance: '/api/social/messages',
      });
    }

    const message = await sendMessage(convId, auth.user.id, content, type, metadata);

    return new Response(
      JSON.stringify({ success: true, message, conversationId: convId }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    const auth = await requireAuth(request).catch(() => null);
    if (auth?.user) {
      await auditSiteChange(
        'social.messages',
        'social_abuse',
        {
          userId: auth.user.id,
          actorEmail: auth.user.email || null,
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
          userAgent: request.headers.get('user-agent') || null,
        },
        { reason: 'messages_error', message, action: 'runtime_exception' },
      );
    }
    return problemJson({
      status: 400,
      title: 'Mesaj İşlenemedi',
      detail: message,
      type: '/problems/social-message-processing-failed',
      instance: '/api/social/messages',
    });
  }
};
