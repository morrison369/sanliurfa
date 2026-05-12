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
import { apiResponse, problemJson, HttpStatus, safeIntParam, safeErrorDetail } from '../../../lib/api';
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
      
      return apiResponse({ conversations, unreadCount }, HttpStatus.OK);
    }

    // Get messages in conversation
    const limit = safeIntParam(searchParams.get('limit'), 50, 0, 1_000_000);
    const before = searchParams.get('before') || undefined;
    const after = searchParams.get('after') || undefined;

    const messages = await getMessages(conversationId, auth.user.id, {
      limit,
      ...(before ? { before } : {}),
      ...(after ? { after } : {}),
    });

    return new Response(
      JSON.stringify({
        messages,
        typingUsers: getConversationTypingUsers(conversationId, auth.user.id),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Mesajlar Alınamadı',
      detail: safeErrorDetail(error, 'Mesajlar alınamadı'),
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
    const auditCtx = buildSocialAuditContext({ request }, auth.user);
    const guardResponse = await enforceSocialAction(
      { request },
      auth.user,
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
      if (typeof newContent !== 'string' || newContent.length > 5000) {
        return problemJson({
          status: 400,
          title: 'Geçersiz İçerik',
          detail: 'Mesaj içeriği 5000 karakteri aşamaz',
          type: '/problems/social-message-edit-content-too-long',
          instance: '/api/social/messages',
        });
      }
      const message = await editMessage(messageId, auth.user.id, newContent);
      return apiResponse({ success: true, message }, HttpStatus.OK);
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
      return apiResponse({ success: true }, HttpStatus.OK);
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
      return apiResponse({ success: true, updatedCount, unreadCount }, HttpStatus.OK);
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
      if (typeof placeName !== 'string' || placeName.length > 200) {
        return problemJson({ status: 400, title: 'Geçersiz Parametre', detail: 'Mekan adı 200 karakterden uzun olamaz', type: '/problems/social-share-place-name-too-long', instance: '/api/social/messages' });
      }
      if (placeMessage !== undefined && placeMessage !== null && (typeof placeMessage !== 'string' || placeMessage.length > 1000)) {
        return problemJson({ status: 400, title: 'Geçersiz Parametre', detail: 'Mesaj 1000 karakterden uzun olamaz', type: '/problems/social-share-place-message-too-long', instance: '/api/social/messages' });
      }
      const message = await sharePlace(conversationId, auth.user.id, placeId, placeName, placeMessage);
      return apiResponse({ success: true, message }, HttpStatus.CREATED);
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
      const latNum = parseFloat(String(latitude));
      const lonNum = parseFloat(String(longitude));
      if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90 ||
          !Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) {
        return problemJson({
          status: 400,
          title: 'Geçersiz Koordinat',
          detail: 'latitude ve longitude geçerli sayısal koordinatlar olmalıdır',
          type: '/problems/social-share-location-invalid-coords',
          instance: '/api/social/messages',
        });
      }
      if (locationMessage !== undefined && (typeof locationMessage !== 'string' || locationMessage.length > 1000)) {
        return problemJson({ status: 400, title: 'Geçersiz Parametre', detail: 'locationMessage 1000 karakterden uzun olamaz', type: '/problems/social-share-location-message-too-long', instance: '/api/social/messages' });
      }
      const message = await shareLocation(conversationId, auth.user.id, latNum, lonNum, locationMessage);
      return apiResponse({ success: true, message }, HttpStatus.CREATED);
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

    if (typeof content !== 'string' || content.length > 5000) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İçerik',
        detail: 'Mesaj içeriği 5000 karakteri aşamaz',
        type: '/problems/social-message-content-too-long',
        instance: '/api/social/messages',
      });
    }

    const VALID_MESSAGE_TYPES = new Set(['text', 'image', 'location', 'place']);
    if (!VALID_MESSAGE_TYPES.has(type)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Tip',
        detail: 'Geçersiz mesaj tipi',
        type: '/problems/social-message-type-invalid',
        instance: '/api/social/messages',
      });
    }

    if (metadata !== undefined && JSON.stringify(metadata).length > 5000) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Metadata',
        detail: 'Metadata 5000 karakteri aşamaz',
        type: '/problems/social-message-metadata-too-large',
        instance: '/api/social/messages',
      });
    }

    const message = await sendMessage(convId, auth.user.id, content, type, metadata);

    return apiResponse({ success: true, message, conversationId: convId }, HttpStatus.CREATED);
  } catch (error) {
    const auditMessage = error instanceof Error ? error.message : 'Failed to send message';
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
        { reason: 'messages_error', message: auditMessage, action: 'runtime_exception' },
      );
    }
    return problemJson({
      status: 400,
      title: 'Mesaj İşlenemedi',
      detail: safeErrorDetail(error, 'Mesaj gönderilemedi'),
      type: '/problems/social-message-processing-failed',
      instance: '/api/social/messages',
    });
  }
};
