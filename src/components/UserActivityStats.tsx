import React, { useState, useEffect } from 'react';

interface ActivityStats {
  views: number;
  searches: number;
  reviews: number;
  comments: number;
  favorites: number;
  total: number;
}

interface UserActivityStatsProps {
  userId: string;
}

/**
 * Display user activity statistics
 */
export default function UserActivityStats({ userId }: UserActivityStatsProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}/activity-stats`);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load activity stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return null;
  }

  const activities = [
    { label: 'Görüntüleme', value: stats.views, icon: '👁️' },
    { label: 'Arama', value: stats.searches, icon: '🔍' },
    { label: 'İnceleme', value: stats.reviews, icon: '⭐' },
    { label: 'Yorum', value: stats.comments, icon: '💬' },
    { label: 'Favori', value: stats.favorites, icon: '❤️' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-bold text-lg mb-4">Aktivite İstatistikleri (Son 30 Gün)</h3>

      <div className="grid grid-cols-5 gap-2 text-center">
        {activities.map(activity => (
          <div key={activity.label} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <p className="text-2xl mb-1">{activity.icon}</p>
            <p className="text-2xl font-bold">{activity.value}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{activity.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Toplam Aktivite: <span className="font-bold">{stats.total}</span>
        </p>
      </div>
    </div>
  );
}
