import React, { useState, useEffect } from 'react';

interface UserStats {
  userId: string;
  reviewsWritten: number;
  favoriteCount: number;
  followersCount: number;
  followingCount: number;
  points: number;
  level: number;
  averageRating?: number;
  totalLikes?: number;
  collectionsCreated: number;
  badgesEarned: number;
  joinDate: string;
  lastActiveAt?: string;
  trends?: ActivityStats;
  rankingPercentile?: number;
}

interface ActivityStats {
  thisMonth: number;
  lastMonth: number;
  thisYear: number;
  allTime: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

interface UserStatsDashboardProps {
  userId: string;
}

export default function UserStatsDashboard({ userId }: UserStatsDashboardProps) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contributionScore, setContributionScore] = useState(0);
  const [rankingPercentile, setRankingPercentile] = useState(0);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch stats
      const statsResponse = await fetch(`/api/users/stats?userId=${userId}`);
      if (!statsResponse.ok) {
        throw new Error('İstatistikleri yüklenemedi');
      }
      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Calculate contribution score (same formula as backend)
      if (statsData.data) {
        let score = 0;
        score += statsData.data.reviewsWritten * 10;
        score += statsData.data.followersCount * 5;
        score += statsData.data.collectionsCreated * 20;
        score += statsData.data.favoriteCount * 2;
        score += Math.floor(statsData.data.points / 10);
        score += statsData.data.level * 50;
        setContributionScore(score);
      }

      // Fetch badges
      const badgesResponse = await fetch(`/api/users/stats/badges?userId=${userId}`);
      if (badgesResponse.ok) {
        const badgesData = await badgesResponse.json();
        setBadges(badgesData.data || []);
      }

      setRankingPercentile(Number(statsData.data?.rankingPercentile || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
        {error || 'İstatistikler yüklenemedi'}
      </div>
    );
  }

  const joinDate = new Date(stats.joinDate);
  const lastActive = stats.lastActiveAt ? new Date(stats.lastActiveAt) : null;
  const averageRating = stats.averageRating ? parseFloat(stats.averageRating.toFixed(1)) : 0;

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Reviews */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Yorumlar</p>
            <span className="text-lg">📝</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.reviewsWritten}</p>
          {stats.trends && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Bu ay: {stats.trends.thisMonth}
            </p>
          )}
        </div>

        {/* Followers */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Takipçiler</p>
            <span className="text-lg">👥</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.followersCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Takip: {stats.followingCount}
          </p>
        </div>

        {/* Favorites */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Favoriler</p>
            <span className="text-lg">⭐</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.favoriteCount}</p>
          {stats.averageRating && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Ort. puan: {averageRating}
            </p>
          )}
        </div>

        {/* Level */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">Level</p>
            <span className="text-lg">🎖️</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.level}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {stats.points} puan
          </p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Collections */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Koleksiyonlar</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.collectionsCreated}</p>
        </div>

        {/* Contribution Score */}
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">Katkı Puanı</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{contributionScore}</p>
        </div>

        {/* Ranking Percentile */}
        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">Sıralama</p>
          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">İlk %{rankingPercentile}</p>
        </div>
      </div>

      {/* Activity Trends */}
      {stats.trends && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aktivite Eğilimi</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bu Ay</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.trends.thisMonth}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Geçen Ay</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.trends.lastMonth}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Bu Yıl</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.trends.thisYear}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Tümü</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.trends.allTime}</p>
            </div>
          </div>
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Rozetler & Başarılar ({badges.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:shadow-md transition-shadow"
                title={badge.description}
              >
                <span className="text-3xl mb-2">{badge.icon}</span>
                <p className="text-xs font-medium text-gray-900 dark:text-white text-center">{badge.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Info */}
      <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hesap Bilgileri</h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <span className="font-medium">Katılım Tarihi:</span>{' '}
            {joinDate.toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          {lastActive && (
            <p>
              <span className="font-medium">Son Aktiflik:</span>{' '}
              {lastActive.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
