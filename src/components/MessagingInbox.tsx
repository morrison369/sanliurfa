import React, { useState, useEffect } from 'react';
import { Send, Trash2, Search } from 'lucide-react';

interface Conversation {
  id: string;
  participantName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
}

export default function MessagingInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetch = async () => {
      const res = await fetch('/api/messages');
      if (res.ok) setConversations((await res.json()).data);
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedConvoId) return;
    const fetch = async () => {
      const res = await fetch(`/api/messages/${selectedConvoId}`);
      if (res.ok) setMessages((await res.json()).data);
    };
    fetch();
    const interval = setInterval(fetch, 10000);
    return () => clearInterval(interval);
  }, [selectedConvoId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConvoId) return;
    const res = await fetch(`/api/messages/${selectedConvoId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newMessage }),
    });
    if (res.ok) {
      setNewMessage('');
      const updated = await fetch(`/api/messages/${selectedConvoId}`);
      setMessages((await updated.json()).data);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConversations(conversations.filter(c => c.id !== id));
      if (selectedConvoId === id) setSelectedConvoId(null);
    }
  };

  const filtered = conversations.filter(c => c.participantName.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full bg-gray-50">
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 px-4 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => (
            <div key={c.id} onClick={() => setSelectedConvoId(c.id)} className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${selectedConvoId === c.id ? 'bg-blue-50' : ''}`}>
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="font-semibold">{c.participantName}</h3>
                  <p className="text-sm text-gray-600 truncate">{c.lastMessage}</p>
                </div>
                {c.unreadCount > 0 && <span className="bg-blue-500 text-white text-xs rounded-full px-2">{c.unreadCount}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selectedConvoId ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex justify-between">
            <h2 className="font-semibold">{conversations.find(c => c.id === selectedConvoId)?.participantName}</h2>
            <button onClick={() => handleDelete(selectedConvoId)} className="p-2 hover:bg-gray-100"><Trash2 className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(m => <div key={m.id} className="bg-gray-100 px-4 py-2 rounded-lg max-w-xs"><p className="text-sm">{m.content}</p></div>)}
          </div>
          <div className="p-4 border-t flex gap-2">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSend()} placeholder="Type..." className="flex-1 px-4 py-2 border rounded-lg" />
            <button onClick={handleSend} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">Select a conversation</div>
      )}
    </div>
  );
}
