import React, { useState, useEffect } from 'react';

interface TrendingUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  recentActivity: {
    reviews: number;
    comments: number;
    favorites: number;
  };
  followers: number;
  expertise: number;
}

interface TrendingUsersCarouselProps {
  limit?: number;
  period?: '7' | '30' | '90';
}

export default function TrendingUsersCarousel({ limit = 8, period = '30' }: TrendingUsersCarouselProps) {
  const [users, setUsers] = useState<TrendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    loadTrendingUsers();
  }, [period]);

  const loadTrendingUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/users/trending?limit=${limit}&period=${period}`);

      if (!response.ok) {
        throw new Error('Trending kullanıcılar yüklenemedi');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('trending-carousel');
    if (container) {
      const scrollAmount = 300;
      const newPos = direction === 'left' ? scrollPos - scrollAmount : scrollPos + scrollAmount;
      container.scrollLeft = newPos;
      setScrollPos(newPos);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Trending kullanıcı yok</p>
      </div>
    );
  }

  const totalActivity = (user: TrendingUser) =>
    user.recentActivity.reviews * 2 +
    user.recentActivity.comments +
    user.recentActivity.favorites;

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="relative">
        {/* Carousel */}
        <div
          id="trending-carousel"
          className="flex gap-4 overflow-x-auto scroll-smooth pb-2"
          style={{ scrollBehavior: 'smooth' }}
        >
          {users.map((user) => (
            <a
              key={user.id}
              href={`/kullanıcı/${user.id}`}
              className="flex-shrink-0 w-48 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover mb-3"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg mb-3">
                    {user.name.charAt(0)}
                  </div>
                )}

                {/* Name */}
                <h3 className="font-bold text-gray-900 dark:text-white truncate w-full">
                  {user.name}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate w-full">
                  @{user.username}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 w-full mt-3 text-xs">
                  <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <p className="text-gray-600 dark:text-gray-400">Aktivite</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {totalActivity(user)}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded">
                    <p className="text-blue-600 dark:text-blue-400">Takipçi</p>
                    <p className="font-bold text-blue-700 dark:text-blue-300">
                      {user.followers}
                    </p>
                  </div>
                </div>

                {/* Expertise Badge */}
                {user.expertise > 0 && (
                  <div className="mt-3 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-medium">
                    {user.expertise} kategori uzmanı
                  </div>
                )}

                {/* Follow Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // Follow logic would go here
                  }}
                  className="w-full mt-3 py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs"
                >
                  Takip Et
                </button>
              </div>
            </a>
          ))}
        </div>

        {/* Navigation Buttons */}
        {users.length > 4 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors z-10"
            >
              ←
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors z-10"
            >
              →
            </button>
          </>
        )}
      </div>

      {/* Period Info */}
      <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
        Son {period === '7' ? '7 gün' : period === '30' ? '30 gün' : '90 gün'} içinde en aktif kullanıcılar
      </p>
    </div>
  );
}
