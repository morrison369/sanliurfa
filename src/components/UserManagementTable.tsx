import { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, Eye, Ban, ShieldOff, ShieldCheck, UserCheck } from 'lucide-react';

interface User {
 id: string;
 email: string;
 name: string;
 role: string;
 status: string;
 created_at: string;
 review_count: number;
 place_count: number;
 is_banned: boolean;
 ban_reason?: string;
 ban_expires_at?: string;
 is_suspended: boolean;
 suspension_reason?: string;
}

interface ActionDialogState {
 userId: string;
 userName: string;
 type: 'ban' | 'unban' | 'suspend' | 'activate';
}

export default function UserManagementTable() {
 const [users, setUsers] = useState<User[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState('');
 const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
 const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);
 const [actionReason, setActionReason] = useState('');
 const [actionLoading, setActionLoading] = useState(false);

 const fetchUsers = useCallback(async (q?: string) => {
 try {
 setLoading(true);
 const params = new URLSearchParams({ limit: '50' });
 if (q) params.append('search', q);
 const res = await fetch(`/api/admin/users?${params}`);
 const json = await res.json();
 if (!json.success) {
 setError(json.error || 'Kullanıcılar alınırken hata oluştu');
 return;
 }
 setUsers(json.users || []);
 setError(null);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 const timer = setTimeout(() => fetchUsers(search), 300);
 return () => clearTimeout(timer);
 }, [search, fetchUsers]);

 const handleAction = async () => {
 if (!actionDialog) return;
 setActionLoading(true);
 try {
 const { userId, type } = actionDialog;

 if (type === 'ban' || type === 'unban') {
 const fd = new FormData();
 fd.append('is_banned', String(type === 'ban'));
 if (type === 'ban' && actionReason) fd.append('ban_reason', actionReason);
 await fetch(`/api/users/${userId}/ban`, { method: 'POST', body: fd });
 } else {
 const action = type === 'activate' ? 'activate' : 'suspend';
 await fetch('/api/admin/users', {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ userIds: [userId], action }),
 });
 }

 setActionDialog(null);
 setActionReason('');
 await fetchUsers(search);
 } finally {
 setActionLoading(false);
 }
 };

 const actionLabels: Record<ActionDialogState['type'], string> = {
 ban: 'Banla',
 unban: 'Banı Kaldır',
 suspend: 'Askıya Al',
 activate: 'Aktifleştir',
 };

 const selectedUser = users.find((u) => u.id === selectedUserId);

 if (loading && users.length === 0) {
 return <div className="text-center py-8 text-[var(--adm-text-muted)]">Yükleniyor…</div>;
 }

 return (
 <div className="space-y-4">
 {error && (
 <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] rounded-sm p-4 flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
 <p className="text-red-700 text-sm">{error}</p>
 </div>
 )}

 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3828]" />
 <input
 type="text"
 placeholder="E-posta veya ad ile ara..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-10 pr-4 py-2 border border-[var(--adm-border-strong)] rounded-sm focus:ring-2 focus:ring-[rgba(184,115,51,0.5)] focus:border-transparent"
 />
 </div>

 <div className="overflow-x-auto rounded-sm border border-[var(--adm-border)]">
 <table className="w-full text-sm">
 <thead className="bg-[var(--adm-bg-hover)] border-b border-[var(--adm-border)]">
 <tr>
 <th className="py-3 px-4 text-left font-medium text-[var(--adm-text-muted)]">Kullanıcı</th>
 <th className="py-3 px-4 text-left font-medium text-[var(--adm-text-muted)]">Rol</th>
 <th className="py-3 px-4 text-left font-medium text-[var(--adm-text-muted)]">Durum</th>
 <th className="py-3 px-4 text-left font-medium text-[var(--adm-text-muted)]">İstatistik</th>
 <th className="py-3 px-4 text-left font-medium text-[var(--adm-text-muted)]">İşlemler</th>
 </tr>
 </thead>
 <tbody>
 {users.map((user) => (
 <tr key={user.id} className="border-b border-[var(--adm-bg-active)] hover:bg-[var(--adm-bg-hover)]">
 <td className="py-3 px-4">
 <div>
 <div className="font-medium text-[var(--adm-text)]">{user.name || 'Adı yok'}</div>
 <div className="text-xs text-[var(--adm-text-muted)]">{user.email}</div>
 </div>
 </td>
 <td className="py-3 px-4">
 <span className={`text-xs px-2 py-1 rounded-full font-medium ${
 user.role === 'admin'
 ? 'bg-[rgba(168,85,247,0.1)] text-purple-300'
 : user.role === 'moderator'
 ? 'bg-[rgba(59,130,246,0.1)] text-blue-300'
 : 'bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)]'
 }`}>
 {user.role === 'admin' ? 'Yönetici' : user.role === 'moderator' ? 'Moderatör' : 'Kullanıcı'}
 </span>
 </td>
 <td className="py-3 px-4">
 {user.is_banned ? (
 <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(239,68,68,0.1)] text-red-700 font-medium">Banlı</span>
 ) : user.is_suspended || user.status === 'suspended' ? (
 <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(249,115,22,0.12)] text-orange-700 font-medium">Askıda</span>
 ) : (
 <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.12)] text-green-400 font-medium">Aktif</span>
 )}
 </td>
 <td className="py-3 px-4 text-[var(--adm-text-muted)] text-xs">
 {user.review_count} yorum · {user.place_count} mekan
 </td>
 <td className="py-3 px-4">
 <div className="flex items-center gap-1">
 <button
 onClick={() => setSelectedUserId(user.id)}
 className="p-1.5 hover:bg-[var(--adm-bg-hover)] rounded text-[var(--adm-text-muted)]"
 title="Detay"
 >
 <Eye className="w-4 h-4" />
 </button>
 {user.is_banned ? (
 <button
 onClick={() => setActionDialog({ userId: user.id, userName: user.name || user.email, type: 'unban' })}
 className="p-1.5 hover:bg-[rgba(34,197,94,0.08)] rounded text-green-600"
 title="Banı Kaldır"
 >
 <ShieldCheck className="w-4 h-4" />
 </button>
 ) : (
 <button
 onClick={() => setActionDialog({ userId: user.id, userName: user.name || user.email, type: 'ban' })}
 className="p-1.5 hover:bg-[rgba(239,68,68,0.1)] rounded text-red-600"
 title="Banla"
 >
 <Ban className="w-4 h-4" />
 </button>
 )}
 {user.status === 'suspended' || user.is_suspended ? (
 <button
 onClick={() => setActionDialog({ userId: user.id, userName: user.name || user.email, type: 'activate' })}
 className="p-1.5 hover:bg-[rgba(34,197,94,0.08)] rounded text-green-600"
 title="Aktifleştir"
 >
 <UserCheck className="w-4 h-4" />
 </button>
 ) : (
 <button
 onClick={() => setActionDialog({ userId: user.id, userName: user.name || user.email, type: 'suspend' })}
 className="p-1.5 hover:bg-[rgba(249,115,22,0.08)] rounded text-orange-600"
 title="Askıya Al"
 >
 <ShieldOff className="w-4 h-4" />
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>

 {users.length === 0 && !loading && (
 <div className="text-center py-8 text-[var(--adm-text-muted)]">Kullanıcı bulunamadı</div>
 )}

 {/* Kullanıcı Detay Modal */}
 {selectedUserId && selectedUser && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedUserId(null)}>
 <div className="bg-[var(--adm-bg-elev)] rounded-sm max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
 <h2 className="text-lg font-semibold mb-4">Kullanıcı Detayları</h2>
 <dl className="space-y-2 text-sm">
 <div className="flex justify-between"><dt className="text-[var(--adm-text-muted)]">Ad</dt><dd className="font-medium">{selectedUser.name || '—'}</dd></div>
 <div className="flex justify-between"><dt className="text-[var(--adm-text-muted)]">E-posta</dt><dd>{selectedUser.email}</dd></div>
 <div className="flex justify-between"><dt className="text-[var(--adm-text-muted)]">Rol</dt><dd>{selectedUser.role}</dd></div>
 <div className="flex justify-between"><dt className="text-[var(--adm-text-muted)]">Kayıt</dt><dd>{new Date(selectedUser.created_at).toLocaleDateString('tr-TR')}</dd></div>
 <div className="flex justify-between"><dt className="text-[var(--adm-text-muted)]">Yorum</dt><dd>{selectedUser.review_count}</dd></div>
 <div className="flex justify-between"><dt className="text-[var(--adm-text-muted)]">Mekan</dt><dd>{selectedUser.place_count}</dd></div>
 {selectedUser.is_banned && (
 <div className="pt-2 border-t">
 <p className="text-red-600 font-medium">Banlı</p>
 {selectedUser.ban_reason && <p className="text-[var(--adm-text-muted)] text-xs mt-1">Neden: {selectedUser.ban_reason}</p>}
 {selectedUser.ban_expires_at && <p className="text-[var(--adm-text-muted)] text-xs">Bitiş: {new Date(selectedUser.ban_expires_at).toLocaleDateString('tr-TR')}</p>}
 </div>
 )}
 {(selectedUser.is_suspended || selectedUser.status === 'suspended') && (
 <div className="pt-2 border-t">
 <p className="text-orange-600 font-medium">Askıya Alındı</p>
 {selectedUser.suspension_reason && <p className="text-[var(--adm-text-muted)] text-xs mt-1">Neden: {selectedUser.suspension_reason}</p>}
 </div>
 )}
 </dl>
 <button
 onClick={() => setSelectedUserId(null)}
 className="mt-6 w-full px-4 py-2 bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] rounded-sm hover:bg-[var(--adm-bg-hover)] font-medium"
 >
 Kapat
 </button>
 </div>
 </div>
 )}

 {/* Aksiyon Onay Modal */}
 {actionDialog && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
 <div className="bg-[var(--adm-bg-elev)] rounded-sm max-w-sm w-full p-6 shadow-xl">
 <h2 className="text-lg font-semibold mb-2">{actionLabels[actionDialog.type]}</h2>
 <p className="text-sm text-[var(--adm-text-muted)] mb-4">
 <span className="font-medium">{actionDialog.userName}</span> kullanıcısını {actionLabels[actionDialog.type].toLowerCase()} istediğinizden emin misiniz?
 </p>
 {(actionDialog.type === 'ban' || actionDialog.type === 'suspend') && (
 <textarea
 value={actionReason}
 onChange={(e) => setActionReason(e.target.value)}
 placeholder="Neden (opsiyonel)..."
 rows={2}
 className="w-full px-3 py-2 border border-[var(--adm-border-strong)] rounded-sm text-sm mb-4 resize-none"
 />
 )}
 <div className="flex gap-3">
 <button
 onClick={() => { setActionDialog(null); setActionReason(''); }}
 className="flex-1 px-4 py-2 bg-[var(--adm-bg-hover)] text-[var(--adm-text-muted)] rounded-sm hover:bg-[var(--adm-bg-hover)] font-medium text-sm"
 disabled={actionLoading}
 >
 İptal
 </button>
 <button
 onClick={handleAction}
 disabled={actionLoading}
 className={`flex-1 px-4 py-2 rounded-sm font-medium text-sm text-white ${
 actionDialog.type === 'ban' ? 'bg-red-600 hover:bg-red-700' :
 actionDialog.type === 'unban' || actionDialog.type === 'activate' ? 'bg-green-600 hover:bg-green-700' :
 'bg-urfa-600 hover:bg-urfa-700'
 }`}
 >
 {actionLoading ? 'Yükleniyor…' : actionLabels[actionDialog.type]}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
