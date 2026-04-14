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
  sharePlace,
  shareLocation
} from '../../../lib/social/messaging-db';
import { requireAuth } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

    const searchParams = url.searchParams;
    const conversationId = searchParams.get('conversationId');
    const type = searchParams.get('type');

    // Get all conversations
    if (type === 'conversations' || !conversationId) {
      const conversations = await getUserConversations(auth.user.id);
      const unreadCount = await getTotalUnreadCount(auth.user.id);
      
      return new Response(
        JSON.stringify({ conversations, unreadCount }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get messages in conversation
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before') || undefined;
    const after = searchParams.get('after') || undefined;

    const messages = await getMessages(conversationId, auth.user.id, { limit, before, after });

    return new Response(
      JSON.stringify({ messages }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get messages';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (auth instanceof Response) return auth;

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
        return new Response(
          JSON.stringify({ error: 'Message ID and new content required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
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
        return new Response(
          JSON.stringify({ error: 'Message ID required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      await deleteMessage(messageId, auth.user.id);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sharePlace') {
      const { placeId, placeName, message: placeMessage } = body;
      if (!conversationId || !placeId || !placeName) {
        return new Response(
          JSON.stringify({ error: 'Conversation ID, place ID, and place name required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
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
        return new Response(
          JSON.stringify({ error: 'Conversation ID, latitude, and longitude required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
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
      return new Response(
        JSON.stringify({ error: 'Conversation ID or recipient ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const message = await sendMessage(convId, auth.user.id, content, type, metadata);

    return new Response(
      JSON.stringify({ success: true, message, conversationId: convId }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send message';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
