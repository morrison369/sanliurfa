import { useEffect, useMemo, useState } from 'react';
import { Search, Send, Trash2 } from 'lucide-react';

interface ConversationApiRow {
 id: string;
 participant_a?: string;
 participant_b?: string;
 full_name?: string;
 avatar_url?: string;
 content?: string;
 msg_time?: string;
 unread?: number | string;
}

interface ConversationUi {
 id: string;
 participantA?: string;
 participantB?: string;
 participantName: string;
 avatarUrl?: string;
 lastMessage: string;
 lastMessageTime: string;
 unreadCount: number;
}

interface MessageRow {
 id: string;
 sender_id: string;
 content: string;
 created_at: string;
}

function toUiConversation(row: ConversationApiRow): ConversationUi {
 return {
 id: row.id,
 participantName: row.full_name || 'Kullanıcı',
 lastMessage: row.content || 'Henüz mesaj yok',
 lastMessageTime: row.msg_time || '',
 unreadCount: Number(row.unread || 0),
 ...(row.participant_a ? { participantA: row.participant_a } : {}),
 ...(row.participant_b ? { participantB: row.participant_b } : {}),
 ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
 };
}

export default function MessagingInbox() {
 const [currentUserId, setCurrentUserId] = useState<string>('');
 const [conversations, setConversations] = useState<ConversationUi[]>([]);
 const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
 const [messages, setMessages] = useState<MessageRow[]>([]);
 const [newMessage, setNewMessage] = useState('');
 const [searchQuery, setSearchQuery] = useState('');
 const [loadingConversations, setLoadingConversations] = useState(true);
 const [unreadTotal, setUnreadTotal] = useState(0);
 const [typingUsers, setTypingUsers] = useState<string[]>([]);
 const [lastReadLabel, setLastReadLabel] = useState<string>('');
 const [unreadDrift, setUnreadDrift] = useState<number>(0);

 const selectedConversation = useMemo(
 () => conversations.find((c) => c.id === selectedConvoId) || null,
 [conversations, selectedConvoId]
 );
 const typingLabel = useMemo(() => {
 if (!selectedConversation || typingUsers.length === 0) return '';
 const idToName = new Map<string, string>();
 if (selectedConversation.participantA) idToName.set(selectedConversation.participantA, selectedConversation.participantName);
 if (selectedConversation.participantB) idToName.set(selectedConversation.participantB, selectedConversation.participantName);
 const names = typingUsers
 .filter((id) => id !== currentUserId)
 .map((id) => idToName.get(id) || 'Kullanıcı');
 if (names.length === 0) return '';
 return names.slice(0, 2).join(', ');
 }, [selectedConversation, typingUsers, currentUserId]);

 const filteredConversations = useMemo(() => {
 const term = searchQuery.trim().toLowerCase();
 if (!term) return conversations;
 return conversations.filter((c) => c.participantName.toLowerCase().includes(term));
 }, [conversations, searchQuery]);

 async function fetchCurrentUser() {
 try {
 const res = await fetch('/api/users/profile');
 if (!res.ok) return;
 const json = await res.json();
 const id = json?.data?.id;
 if (typeof id === 'string' && id.length > 0) {
 setCurrentUserId(id);
 }
 } catch {
 // No-op: UI can continue in neutral mode.
 }
 }

 async function fetchConversations() {
 const res = await fetch('/api/messages?limit=100');
 if (!res.ok) return;
 const json = await res.json();
 const rows: ConversationApiRow[] = Array.isArray(json?.data) ? json.data : [];
 const mapped = rows.map(toUiConversation);
 setConversations(mapped);
 const localUnread = mapped.reduce((acc, c) => acc + Number(c.unreadCount || 0), 0);
 setUnreadDrift(localUnread - unreadTotal);
 if (!selectedConvoId && mapped.length > 0) {
 setSelectedConvoId(mapped[0].id);
 }
 }

 async function fetchMessages(conversationId: string) {
 const res = await fetch(`/api/messages/${conversationId}?limit=100`);
 if (!res.ok) return;
 const json = await res.json();
 const rows: MessageRow[] = Array.isArray(json?.data) ? json.data : [];
 setMessages(rows);
 }

 async function fetchReadReceipts(conversationId: string) {
 const res = await fetch(`/api/social/messages/receipts?conversationId=${encodeURIComponent(conversationId)}`);
 if (!res.ok) return;
 const json = await res.json();
 const receipts = Array.isArray(json?.receipts) ? json.receipts : [];
 const latest = receipts.find((r: { last_read_at?: string }) => r?.last_read_at);
 if (!latest) {
 setLastReadLabel('');
 return;
 }
 const name = latest.full_name || latest.username || latest.user_id || 'Kullanıcı';
 setLastReadLabel(`${name} • ${new Date(latest.last_read_at).toLocaleString('tr-TR')}`);
 }

 async function maybeCreateConversationFromUrl() {
 const params = new URLSearchParams(window.location.search);
 const conversationId = params.get('conversation');
 if (conversationId) {
 setSelectedConvoId(conversationId);
 return;
 }

 const recipientId = params.get('recipientId') || params.get('user');
 if (!recipientId) return;

 const res = await fetch('/api/messages', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ recipient_id: recipientId }),
 });
 if (!res.ok) return;

 const json = await res.json();
 const createdId = json?.data?.id;
 if (typeof createdId === 'string') {
 setSelectedConvoId(createdId);
 }
 }

 useEffect(() => {
 let mounted = true;

 (async () => {
 try {
 await Promise.all([fetchCurrentUser(), fetchConversations()]);
 await maybeCreateConversationFromUrl();
 await fetchConversations();
 } finally {
 if (mounted) setLoadingConversations(false);
 }
 })();

 const interval = setInterval(fetchConversations, 30000);
 return () => {
 mounted = false;
 clearInterval(interval);
 };
 }, []);

 useEffect(() => {
 const es = new EventSource('/api/social/messages/stream');
 es.addEventListener('sync', (event) => {
 try {
 const parsed = JSON.parse((event as MessageEvent).data || '{}');
 if (typeof parsed.unreadCount === 'number') setUnreadTotal(parsed.unreadCount);
 if (Array.isArray(parsed.typingUsers)) setTypingUsers(parsed.typingUsers);
 void fetchConversations();
 if (selectedConvoId) {
 void fetchMessages(selectedConvoId);
 void fetchReadReceipts(selectedConvoId);
 }
 } catch {
 // noop
 }
 });
 return () => es.close();
 }, [selectedConvoId]);

 useEffect(() => {
 if (!selectedConvoId) return;
 fetchMessages(selectedConvoId);
 fetchReadReceipts(selectedConvoId);
 void fetch('/api/social/messages', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'markRead', conversationId: selectedConvoId }),
 }).catch(() => {});
 const interval = setInterval(() => fetchMessages(selectedConvoId), 10000);
 const receiptInterval = setInterval(() => fetchReadReceipts(selectedConvoId), 15000);
 return () => {
 clearInterval(interval);
 clearInterval(receiptInterval);
 };
 }, [selectedConvoId]);

 const handleSend = async () => {
 const content = newMessage.trim();
 if (!content || !selectedConvoId) return;

 const res = await fetch(`/api/messages/${selectedConvoId}`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ content }),
 });
 if (!res.ok) return;

 setNewMessage('');
 void fetch('/api/social/messages', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ action: 'typing', conversationId: selectedConvoId, isTyping: false }),
 }).catch(() => {});
 await Promise.all([fetchMessages(selectedConvoId), fetchConversations()]);
 };

 const handleDeleteConversation = async (id: string) => {
 if (!await (window as any).showConfirm?.('Bu konuşmayı gizlemek istediğinize emin misiniz?')) return;
 const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
 if (!res.ok) return;

 const next = conversations.filter((c) => c.id !== id);
 setConversations(next);
 setSelectedConvoId(next[0]?.id || null);
 setMessages([]);
 };

 return (
 <div className="flex h-[calc(100vh-160px)] min-h-[620px] bg-[rgba(184,115,51,0.04)]">
 <div className="w-80 border-r border-[rgba(184,115,51,0.14)] bg-[var(--bg-card)] flex flex-col">
 <div className="p-4 border-b">
 <h2 className="text-xl font-bold mb-4">Mesajlar</h2>
 {unreadTotal > 0 && <p className="mb-2 text-xs text-amber-400">Toplam okunmamış: {unreadTotal}</p>}
 {unreadDrift !== 0 && (
 <p className="mb-2 text-xs text-rose-400">Unread drift alarmı: {unreadDrift > 0 ? '+' : ''}{unreadDrift}</p>
 )}
 <div className="relative">
 <Search className="absolute left-3 top-3 w-4 h-4 text-[#4A3828]" />
 <input
 type="text"
 placeholder="Sohbet ara..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 px-4 py-2 border rounded-sm text-sm"
 />
 </div>
 </div>

 <div className="flex-1 overflow-y-auto">
 {loadingConversations ? (
 <div className="p-4 text-sm text-[#7A6B58]">Yükleniyor…</div>
 ) : filteredConversations.length === 0 ? (
 <div className="p-6 text-sm text-[#7A6B58]">Henüz sohbet yok.</div>
 ) : (
 filteredConversations.map((c) => (
 <button
 key={c.id}
 onClick={() => setSelectedConvoId(c.id)}
 className={`w-full p-4 border-b text-left hover:bg-[rgba(184,115,51,0.04)] ${
 selectedConvoId === c.id ? 'bg-[rgba(234,179,8,0.08)]' : ''
 }`}
 >
 <div className="flex justify-between items-start gap-2">
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold truncate">{c.participantName}</h3>
 <p className="text-sm text-[#7A6B58] truncate">{c.lastMessage}</p>
 {c.lastMessageTime && (
 <p className="text-xs text-[#4A3828] mt-1">
 {new Date(c.lastMessageTime).toLocaleString('tr-TR')}
 </p>
 )}
 </div>
 {c.unreadCount > 0 && (
 <span className="bg-urfa-600 text-white text-xs rounded-full px-2 py-0.5">
 {c.unreadCount}
 </span>
 )}
 </div>
 </button>
 ))
 )}
 </div>
 </div>

 {selectedConvoId && selectedConversation ? (
 <div className="flex-1 flex flex-col bg-[var(--bg-card)]">
 <div className="p-4 border-b flex items-center justify-between">
 <div>
 <h2 className="font-semibold">{selectedConversation.participantName}</h2>
 {typingLabel && <p className="text-xs text-emerald-400">{typingLabel} yazıyor...</p>}
 {lastReadLabel && <p className="text-xs text-[#7A6B58]">Son okuma: {lastReadLabel}</p>}
 </div>
 <button
 onClick={() => handleDeleteConversation(selectedConvoId)}
 className="p-2 hover:bg-[rgba(184,115,51,0.06)] rounded"
 aria-label="Sohbeti gizle"
 >
 <Trash2 className="w-5 h-5" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-4 space-y-3">
 {messages.length === 0 ? (
 <div className="text-sm text-[#7A6B58]">Henüz mesaj yok. İlk mesajı gönderin.</div>
 ) : (
 messages.map((m) => {
 const isMine = currentUserId ? m.sender_id === currentUserId : false;
 return (
 <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
 <div
 className={`px-4 py-2 rounded-sm max-w-[70%] ${
 isMine ? 'bg-urfa-600 text-white' : 'bg-[rgba(184,115,51,0.06)] text-[#1F1410]'
 }`}
 >
 <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
 <p className={`text-xs mt-1 ${isMine ? 'text-[#1F1410]' : 'text-[#7A6B58]'}`}>
 {new Date(m.created_at).toLocaleTimeString('tr-TR', {
 hour: '2-digit',
 minute: '2-digit',
 })}
 </p>
 </div>
 </div>
 );
 })
 )}
 </div>

 <div className="p-4 border-t flex gap-2">
 <input
 type="text"
 value={newMessage}
 onChange={(e) => {
 const value = e.target.value;
 setNewMessage(value);
 if (!selectedConvoId) return;
 void fetch('/api/social/messages', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 action: 'typing',
 conversationId: selectedConvoId,
 isTyping: value.trim().length > 0,
 }),
 }).catch(() => {});
 }}
 onKeyDown={(e) => e.key === 'Enter' && handleSend()}
 placeholder="Mesaj yaz..."
 className="flex-1 px-4 py-2 border rounded-sm"
 />
 <button
 onClick={handleSend}
 className="px-4 py-2 bg-urfa-600 text-white rounded-sm hover:bg-urfa-700"
 aria-label="Mesaj gönder"
 >
 <Send className="w-5 h-5" />
 </button>
 </div>
 </div>
 ) : (
 <div className="flex-1 flex items-center justify-center text-[#7A6B58] bg-[var(--bg-card)]">
 Sohbet seçin
 </div>
 )}
 </div>
 );
}
