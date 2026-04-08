import React, { useState, useEffect } from 'react';

interface FeedItem {
  id: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  actionType: string;
  description: string;
  icon: string;
  timeAgo: string;
  isOwn?: boolean;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  type?: 'personal' | 'feed' | 'trending';
  userId?: string;
}

export default function ActivityFeedDisplay({ type = 'feed', userId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const limit = 20;

  useEffect(() => {
    loadActivities();
  }, [type, userId]);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setActivities([]);
      setOffset(0);

      let url = '/api/feed?';

      if (type === 'personal') {
        url += 'type=personal&';
      } else if (type === 'trending') {
        url += 'type=trending&';
      } else if (userId) {
        url = `/api/feed/users/${userId}?`;
      }

      url += `limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Aktiviteleri yüklenemedi');
      }

      const data = await response.json();
      setActivities(data.data || []);
      setHasMore((data.data?.length || 0) >= limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    try {
      const newOffset = offset + limit;

      let url = '/api/feed?';

      if (type === 'personal') {
        url += 'type=personal&';
      } else if (type === 'trending') {
        url += 'type=trending&';
      } else if (userId) {
        url = `/api/feed/users/${userId}?`;
      }

      url += `limit=${limit}&offset=${newOffset}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Daha fazla yüklenemedi');
      }

      const data = await response.json();
      const newActivities = data.data || [];

      setActivities([...activities, ...newActivities]);
      setOffset(newOffset);
      setHasMore(newActivities.length >= limit);
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

      {activities.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-2">Henüz aktivite yok</p>
          {type === 'personal' && (
            <p className="text-sm">Yerleri keşfet ve yorum yapmaya başla!</p>
          )}
          {type === 'feed' && (
            <p className="text-sm">Takip etmek için kullanıcılar bul</p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <a
                    href={`/kullanıcı/${activity.userId}`}
                    className="flex-shrink-0"
                  >
                    {activity.userAvatar ? (
                      <img
                        src={activity.userAvatar}
                        alt={activity.userName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-bold">
                        {activity.userName.charAt(0)}
                      </div>
                    )}
                  </a>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{activity.icon}</span>
                      <a
                        href={`/kullanıcı/${activity.userId}`}
                        className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {activity.userName}
                      </a>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {activity.timeAgo}
                    </p>

                    {/* Reference */}
                    {activity.metadata?.placeName && (
                      <a
                        href={`/yerler/${activity.metadata.placeId}`}
                        className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        → {activity.metadata.placeName}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full py-3 text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
            >
              Daha Fazla Yükle
            </button>
          )}
        </>
      )}
    </div>
  );
}
