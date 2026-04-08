import React, { useState, useEffect } from 'react';

interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  isFollowing: boolean;
  activityCount: number;
  matchingInterests: number;
}

export default function UserSuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/users/suggestions?limit=6');

      if (!response.ok) {
        throw new Error('Öneriler yüklenemedi');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUser = async (userId: string, currentlyFollowing: boolean) => {
    if (isFollowing) return;

    setFollowingId(userId);
    setIsFollowing(true);

    try {
      const endpoint = currentlyFollowing ? `/api/following/unfollow` : `/api/following/${userId}`;
      const method = currentlyFollowing ? 'DELETE' : 'POST';

      const response = await fetch(endpoint, { method });

      if (!response.ok) {
        throw new Error('İşlem başarısız');
      }

      // Update suggestion status
      setSuggestions(
        suggestions.map((s) =>
          s.id === userId ? { ...s, isFollowing: !currentlyFollowing } : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setFollowingId(null);
      setIsFollowing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Şu an için öneri yok</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((user) => (
          <div
            key={user.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.name.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  @{user.username}
                </p>
              </div>
            </div>

            {/* Activity Info */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <p className="text-gray-600 dark:text-gray-400">Aktivite</p>
                <p className="font-bold text-gray-900 dark:text-white">{user.activityCount}</p>
              </div>
              {user.matchingInterests > 0 && (
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                  <p className="text-blue-600 dark:text-blue-400">Ortak İlgi</p>
                  <p className="font-bold text-blue-700 dark:text-blue-300">{user.matchingInterests}</p>
                </div>
              )}
            </div>

            {/* Follow Button */}
            <button
              onClick={() => handleFollowUser(user.id, user.isFollowing)}
              disabled={isFollowing && followingId === user.id}
              className={`w-full py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                user.isFollowing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isFollowing && followingId === user.id
                ? 'İşleniyor...'
                : user.isFollowing
                ? 'Takip Ediliyor'
                : 'Takip Et'}
            </button>

            {/* View Profile Link */}
            <a
              href={`/kullanıcı/${user.id}`}
              className="block text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2 py-1"
            >
              Profili Görüntüle
            </a>
          </div>
        ))}
      </div>

      <button
        onClick={loadSuggestions}
        className="w-full py-2 px-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-600 dark:border-blue-400 rounded-lg font-medium transition-colors"
      >
        Yeni Öneriler Yükle
      </button>
    </div>
  );
}
