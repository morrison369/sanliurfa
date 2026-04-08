import React, { useState, useEffect } from 'react';

interface BlockedUser {
  block_id: string;
  blocked_user: {
    id: string;
    full_name: string;
    username?: string;
    avatar_url?: string;
    level: number;
    points: number;
  };
  reason?: string;
  created_at: string;
}

export default function BlockingManager() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/blocking');

      if (!response.ok) {
        throw new Error('Engellenen kullanıcılar yüklenemedi');
      }

      const data = await response.json();
      setBlockedUsers(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    if (!confirm('Bu kullanıcının engellemesini kaldırmak istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/blocking?blocked_id=${blockedId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Engelleme kaldırılamadı');
      }

      setBlockedUsers(blockedUsers.filter((b) => b.blocked_user.id !== blockedId));
      setSuccessMessage('Engelleme başarıyla kaldırıldı');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400 text-sm">
          {successMessage}
        </div>
      )}

      {blockedUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Henüz engellediğiniz kullanıcı yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blockedUsers.map((block) => (
            <div key={block.block_id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {block.blocked_user.avatar_url ? (
                    <img
                      src={block.blocked_user.avatar_url}
                      alt={block.blocked_user.full_name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {block.blocked_user.full_name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <a
                      href={`/kullanıcı/${block.blocked_user.id}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 block truncate"
                    >
                      {block.blocked_user.full_name}
                    </a>
                    {block.blocked_user.username && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        @{block.blocked_user.username}
                      </p>
                    )}
                    {block.reason && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        Neden: {block.reason}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Engelleme: {new Date(block.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleUnblock(block.blocked_user.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex-shrink-0"
                >
                  Engellemeyi Kaldır
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
