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
    return <div className="text-center py-8 text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="E-posta veya ad ile ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 text-left font-medium text-gray-700">Kullanıcı</th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">Rol</th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">Durum</th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">İstatistik</th>
              <th className="py-3 px-4 text-left font-medium text-gray-700">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-gray-900">{user.name || 'Adı yok'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700'
                      : user.role === 'moderator'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role === 'admin' ? 'Yönetici' : user.role === 'moderator' ? 'Moderatör' : 'Kullanıcı'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {user.is_banned ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Banlı</span>
                  ) : user.is_suspended || user.status === 'suspended' ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Askıda</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Aktif</span>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-600 text-xs">
                  {user.review_count} yorum · {user.place_count} mekan
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedUserId(user.id)}
                      className="p-1.5 hover:bg-gray-100 rounded text-blue-600"
                      title="Detay"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {user.is_banned ? (
                      <button
                        onClick={() => setActionDialog({ userId: user.id, userName: user.name || user.email, type: 'unban' })}
                        className="p-1.5 hover:bg-green-50 rounded text-green-600"
                        title="Banı Kaldır"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActionDialog({ userId: user.id, userName: user.name || user.email, type: 'ban' })}
                        className="p-1.5 hover:bg-red-50 rounded text-red-600"
                        title="Banla"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    {user.status === 'suspended' || user.is_suspended ? (
                      <button
                        onClick={() => setActionDialog({ userId: user.id, userName: user.name || user.email, type: 'activate' })}
                        className="p-1.5 hover:bg-green-50 rounded text-green-600"
                        title="Aktifleştir"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActionDialog({ userId: user.id, userName: user.name || user.email, type: 'suspend' })}
                        className="p-1.5 hover:bg-orange-50 rounded text-orange-600"
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
        <div className="text-center py-8 text-gray-500">Kullanıcı bulunamadı</div>
      )}

      {/* Kullanıcı Detay Modal */}
      {selectedUserId && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedUserId(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Kullanıcı Detayları</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Ad</dt><dd className="font-medium">{selectedUser.name || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">E-posta</dt><dd>{selectedUser.email}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Rol</dt><dd>{selectedUser.role}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Kayıt</dt><dd>{new Date(selectedUser.created_at).toLocaleDateString('tr-TR')}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Yorum</dt><dd>{selectedUser.review_count}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Mekan</dt><dd>{selectedUser.place_count}</dd></div>
              {selectedUser.is_banned && (
                <div className="pt-2 border-t">
                  <p className="text-red-600 font-medium">Banlı</p>
                  {selectedUser.ban_reason && <p className="text-gray-600 text-xs mt-1">Neden: {selectedUser.ban_reason}</p>}
                  {selectedUser.ban_expires_at && <p className="text-gray-500 text-xs">Bitiş: {new Date(selectedUser.ban_expires_at).toLocaleDateString('tr-TR')}</p>}
                </div>
              )}
              {(selectedUser.is_suspended || selectedUser.status === 'suspended') && (
                <div className="pt-2 border-t">
                  <p className="text-orange-600 font-medium">Askıya Alındı</p>
                  {selectedUser.suspension_reason && <p className="text-gray-600 text-xs mt-1">Neden: {selectedUser.suspension_reason}</p>}
                </div>
              )}
            </dl>
            <button
              onClick={() => setSelectedUserId(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Aksiyon Onay Modal */}
      {actionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-2">{actionLabels[actionDialog.type]}</h2>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium">{actionDialog.userName}</span> kullanıcısını {actionLabels[actionDialog.type].toLowerCase()} istediğinizden emin misiniz?
            </p>
            {(actionDialog.type === 'ban' || actionDialog.type === 'suspend') && (
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Neden (opsiyonel)..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4 resize-none"
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setActionDialog(null); setActionReason(''); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
                disabled={actionLoading}
              >
                İptal
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm text-white ${
                  actionDialog.type === 'ban' ? 'bg-red-600 hover:bg-red-700' :
                  actionDialog.type === 'unban' || actionDialog.type === 'activate' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {actionLoading ? 'Yükleniyor...' : actionLabels[actionDialog.type]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
