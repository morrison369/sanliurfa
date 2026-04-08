/**
 * User Management Table Component
 * Manage users and their account status
 */
import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Eye } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  last_login_at: string;
  review_count: number;
  warning_count: number;
  active_flags: number;
}

export default function UserManagementTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const fetchUsers = async (query?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (query) params.append('search', query);

      const res = await fetch(`/api/admin/users?${params}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'Kullanıcılar alınırken hata oluştu');
        return;
      }

      setUsers(json.data.users || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  if (loading && users.length === 0) {
    return <div className="text-center py-8 text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Hata</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="E-posta veya ad ile ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Kullanıcı</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Rol</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">İçerik</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Durum</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-gray-900">{user.full_name || 'Adı yok'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : user.role === 'moderator'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {user.role === 'admin' ? 'Yönetici' : user.role === 'moderator' ? 'Moderatör' : 'Kullanıcı'}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">{user.review_count} inceleme</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {user.active_flags > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        <AlertCircle className="w-3 h-3" />
                        {user.active_flags} bayrak
                      </span>
                    )}
                    {user.warning_count > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        {user.warning_count} uyarı
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={() => setSelectedUserId(user.id)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-xs flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    Detay
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">Kullanıcı bulunamadı</div>
      )}

      {/* User Detail Modal - simplified version */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Kullanıcı Detayları</h2>
            <div className="text-sm text-gray-600">
              <p>Kullanıcı ID: {selectedUserId}</p>
            </div>
            <button
              onClick={() => setSelectedUserId(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
