import React, { useState, useEffect } from 'react';

interface Activity {
  id: string;
  user_id: string;
  user_name: string;
  user_username?: string;
  user_avatar?: string;
  user_level: number;
  action_type: string;
  reference_type?: string;
  reference_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

interface ActivityFeedProps {
  userId: string;
}

export default function ActivityFeed({ userId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<'all' | 'reviews' | 'favorites' | 'comments' | 'badges'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setActivities([]);
    setOffset(0);
    loadActivities(0);
  }, [filter]);

  const loadActivities = async (newOffset: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `/api/feed/activity?filter=${filter}&limit=20&offset=${newOffset}`
      );

      if (!response.ok) {
        throw new Error('Aktivite akışı yüklenemedi');
      }

      const data = await response.json();
      if (newOffset === 0) {
        setActivities(data.data || []);
      } else {
        setActivities([...activities, ...(data.data || [])]);
      }

      setHasMore(data.data.length >= 20);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    const newOffset = offset + 20;
    setOffset(newOffset);
    loadActivities(newOffset);
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'review_created':
        return '✍️';
      case 'favorite_added':
        return '❤️';
      case 'badge_earned':
        return '🏅';
      case 'comment_posted':
        return '💬';
      case 'level_up':
        return '⬆️';
      case 'points_earned':
        return '⭐';
      default:
        return '📌';
    }
  };

  const getActivityDescription = (activity: Activity): string => {
    switch (activity.action_type) {
      case 'review_created':
        return `"${activity.metadata?.placeName || 'bir yere'}" yorum yaptı`;
      case 'favorite_added':
        return `"${activity.metadata?.placeName || 'bir yeri'}" favorilerine ekledi`;
      case 'badge_earned':
        return `"${activity.metadata?.badgeName || 'Rozet'}" rozeti kazandı`;
      case 'comment_posted':
        return 'Blog yazısına yorum yaptı';
      case 'points_earned':
        return `${activity.metadata?.points || 0} puan kazandı`;
      case 'level_up':
        return `Level ${activity.metadata?.newLevel || '?'} oldu`;
      default:
        return 'Bir eylem gerçekleştirdi';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins}d`;
    if (diffHours < 24) return `${diffHours}s`;
    if (diffDays < 7) return `${diffDays}g`;
    return date.toLocaleDateString('tr-TR');
  };

  const formatDetailedTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div>
      {/* Filter Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { value: 'all' as const, label: 'Tümü' },
          { value: 'reviews' as const, label: 'Yorumlar' },
          { value: 'favorites' as const, label: 'Favoriler' },
          { value: 'comments' as const, label: 'Yorum Yanıtları' },
          { value: 'badges' as const, label: 'Rozetler' }
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={`px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
              filter === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && activities.length === 0 && (
        <div className="flex justify-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Aktivite akışı yükleniyor...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && activities.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🌊</p>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Aktivite yok</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
            Takip ettiğiniz kullanıcıların aktiviteleri burada görünecek
          </p>
        </div>
      )}

      {/* Activity Items */}
      {!isLoading && activities.length > 0 && (
        <div className="space-y-4">
          {activities.map((activity) => (
            <a
              key={activity.id}
              href={`/kullanıcı/${activity.user_id}`}
              className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              <div className="flex gap-4">
                {/* User Avatar & Icon */}
                <div className="flex-shrink-0 flex gap-3">
                  <div className="relative">
                    {activity.user_avatar ? (
                      <img
                        src={activity.user_avatar}
                        alt={activity.user_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                        {activity.user_name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 text-lg">{getActivityIcon(activity.action_type)}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {activity.user_name}
                        </p>
                        {activity.user_username && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            @{activity.user_username}
                          </p>
                        )}
                        {activity.user_level > 1 && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                            Lv{activity.user_level}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatTime(activity.created_at)}
                    </p>
                  </div>

                  {/* Activity Description */}
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    {getActivityDescription(activity)}
                  </p>

                  {/* Timestamp */}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDetailedTime(activity.created_at)}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && activities.length > 0 && !isLoading && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Daha Fazla Yükle
          </button>
        </div>
      )}
    </div>
  );
}
