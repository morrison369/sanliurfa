import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  full_name: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  points: number;
  level: number;
  created_at: string;
}

interface UserSearchResultsProps {
  currentUserId?: string;
}

export default function UserSearchResults({ currentUserId }: UserSearchResultsProps) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'points' | 'level' | 'recent'>('relevance');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim() || query.length < 2) {
      setError('Arama terimi en az 2 karakter olmalıdır');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/users/search?q=${encodeURIComponent(query.trim())}&sortBy=${sortBy}&limit=50`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Arama başarısız');
      }

      const data = await response.json();
      setUsers(data.data || []);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSortChange = async (newSort: typeof sortBy) => {
    setSortBy(newSort);
    if (query.trim()) {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(query.trim())}&sortBy=${newSort}&limit=50`
        );

        if (response.ok) {
          const data = await response.json();
          setUsers(data.data || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getLevelBadgeColor = (level: number) => {
    if (level <= 1) return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white';
    if (level <= 5) return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
    if (level <= 10) return 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100';
    return 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100';
  };

  return (
    <div>
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kullanıcı adı veya adı ara..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? '⟳' : '🔍'} Ara
          </button>
        </div>
      </form>

      {/* Sorting Options */}
      {hasSearched && (
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { value: 'relevance' as const, label: 'İlgililik' },
            { value: 'points' as const, label: 'Puan' },
            { value: 'level' as const, label: 'Seviye' },
            { value: 'recent' as const, label: 'Yeni' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                sortBy === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Aranıyor...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasSearched && users.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-2">😕</p>
          <p className="text-gray-600 dark:text-gray-400">Sonuç bulunamadı</p>
        </div>
      )}

      {!isLoading && users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <a
              key={user.id}
              href={`/kullanıcı/${user.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Cover */}
              <div className="h-24 bg-gradient-to-r from-blue-400 to-purple-400"></div>

              {/* Content */}
              <div className="px-4 py-4">
                {/* Avatar */}
                <div className="flex gap-4 mb-4">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name}
                      className="w-16 h-16 rounded-lg object-cover -mt-12 border-4 border-white dark:border-gray-800"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center -mt-12 border-4 border-white dark:border-gray-800 text-2xl">
                      👤
                    </div>
                  )}
                  <div className={`px-3 py-1 rounded-lg text-sm font-bold h-fit ${getLevelBadgeColor(user.level)}`}>
                    Lv {user.level}
                  </div>
                </div>

                {/* User Info */}
                <h3 className="font-bold text-gray-900 dark:text-white truncate">
                  {user.full_name}
                </h3>
                {user.username && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    @{user.username}
                  </p>
                )}

                {user.bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">
                    {user.bio}
                  </p>
                )}

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{user.points}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Puan</p>
                  </div>
                  <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                  {currentUserId && currentUserId !== user.id && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/api/messages?recipientId=${user.id}`;
                      }}
                      className="flex-1 text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium py-1"
                    >
                      💬 Mesaj
                    </button>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* No Search State */}
      {!hasSearched && !isLoading && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Kullanıcı aramak için arama kutusunu kullanın
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            En az 2 karakter girin
          </p>
        </div>
      )}
    </div>
  );
}
