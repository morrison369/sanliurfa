import { formatAdminDateTime } from './admin-format';

export interface MessagingInboxConversation {
  id: string;
  participantName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface MessagingInboxMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
}

export interface MessagingInboxState {
  conversations: MessagingInboxConversation[];
  selectedConversationId: string | null;
  messages: MessagingInboxMessage[];
  draft: string;
  searchQuery: string;
  error: string | null;
  loading: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function extractMessagingInboxConversations(payload: unknown): MessagingInboxConversation[] {
  const root = asRecord(payload);
  const data = root?.data;
  const list = asArray<Record<string, unknown>>(data);

  return list.map((item) => ({
    id: asString(item.id),
    participantName: asString(item.full_name, 'Bilinmeyen kullanici'),
    lastMessage: asString(item.content, 'Mesaj yok'),
    lastMessageTime: asString(item.msg_time || item.last_activity_at),
    unreadCount: asNumber(item.unread),
  })).filter((item) => item.id);
}

export function extractMessagingInboxMessages(payload: unknown): MessagingInboxMessage[] {
  const root = asRecord(payload);
  const data = root?.data;
  const list = asArray<Record<string, unknown>>(data);

  return list.map((item) => ({
    id: asString(item.id),
    content: asString(item.content),
    createdAt: asString(item.created_at),
    senderId: asString(item.sender_id),
  })).filter((item) => item.id);
}

export function createMessagingInboxState(): MessagingInboxState {
  return {
    conversations: [],
    selectedConversationId: null,
    messages: [],
    draft: '',
    searchQuery: '',
    error: null,
    loading: true,
  };
}

export function applyMessagingInboxSelection(state: MessagingInboxState): MessagingInboxState {
  const exists = state.selectedConversationId
    ? state.conversations.some((conversation) => conversation.id === state.selectedConversationId)
    : false;

  return {
    ...state,
    selectedConversationId: exists ? state.selectedConversationId : (state.conversations[0]?.id ?? null),
  };
}

export function renderMessagingInbox(state: MessagingInboxState, currentUserId: string): string {
  if (state.loading) {
    return '<div class="flex h-[70vh] items-center justify-center text-sm text-slate-500">Mesajlar yukleniyor...</div>';
  }

  if (state.error) {
    return `<div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">${escapeHtml(state.error)}</div>`;
  }

  const query = state.searchQuery.trim().toLocaleLowerCase('tr-TR');
  const filtered = state.conversations.filter((conversation) =>
    !query || conversation.participantName.toLocaleLowerCase('tr-TR').includes(query),
  );
  const selectedConversation = state.conversations.find(
    (conversation) => conversation.id === state.selectedConversationId,
  ) ?? null;

  const listHtml = filtered.length
    ? filtered.map((conversation) => {
        const selected = conversation.id === state.selectedConversationId;
        return `
          <button type="button" data-message-conversation-id="${conversation.id}" class="w-full border-b border-slate-200 p-4 text-left transition ${selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-slate-900">${escapeHtml(conversation.participantName)}</p>
                <p class="mt-1 truncate text-sm text-slate-600">${escapeHtml(conversation.lastMessage || 'Mesaj yok')}</p>
                <p class="mt-1 text-xs text-slate-500">${escapeHtml(formatAdminDateTime(conversation.lastMessageTime, 'Zaman yok'))}</p>
              </div>
              ${conversation.unreadCount > 0 ? `<span class="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">${conversation.unreadCount}</span>` : ''}
            </div>
          </button>
        `;
      }).join('')
    : '<div class="p-4 text-sm text-slate-500">Aramaniza uygun konusma bulunamadi.</div>';

  const messagesHtml = selectedConversation
    ? (state.messages.length
      ? state.messages.map((message) => {
          const own = message.senderId === currentUserId;
          return `
            <div class="flex ${own ? 'justify-end' : 'justify-start'}">
              <div class="max-w-lg rounded-2xl px-4 py-3 shadow-sm ${own ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}">
                <p class="text-sm">${escapeHtml(message.content)}</p>
                <p class="mt-2 text-xs ${own ? 'text-blue-100' : 'text-slate-500'}">${escapeHtml(formatAdminDateTime(message.createdAt, '-'))}</p>
              </div>
            </div>
          `;
        }).join('')
      : '<div class="text-sm text-slate-500">Bu konusmada henuz mesaj yok.</div>')
    : '<div class="flex h-full items-center justify-center text-sm text-slate-500">Goruntulemek icin bir konusma secin.</div>';

  return `
    <div class="flex h-[70vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <aside class="flex w-full max-w-sm flex-col border-r border-slate-200 bg-slate-50">
        <div class="border-b border-slate-200 p-4">
          <h2 class="text-xl font-bold text-slate-900">Mesajlar</h2>
          <div class="mt-4">
            <input data-message-search-input type="search" value="${escapeHtml(state.searchQuery)}" placeholder="Konusma ara" class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-blue-500" />
          </div>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto">${listHtml}</div>
      </aside>
      <section class="flex min-w-0 flex-1 flex-col">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 class="font-semibold text-slate-900">${escapeHtml(selectedConversation?.participantName || 'Konusma secilmedi')}</h3>
            <p class="text-xs text-slate-500">${selectedConversation ? 'Direkt mesaj kutusu' : 'Liste sol panelde'}</p>
          </div>
          ${selectedConversation ? '<button type="button" data-message-delete class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Konusmayi gizle</button>' : ''}
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-5"><div class="space-y-4">${messagesHtml}</div></div>
        ${selectedConversation ? `
          <form data-message-send-form class="border-t border-slate-200 bg-white p-4">
            <div class="flex gap-3">
              <input data-message-draft-input type="text" value="${escapeHtml(state.draft)}" placeholder="Mesajinizi yazin" class="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500" />
              <button type="submit" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">Gonder</button>
            </div>
          </form>
        ` : ''}
      </section>
    </div>
  `;
}
