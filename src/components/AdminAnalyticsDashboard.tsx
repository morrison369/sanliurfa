import React, { useState, useEffect } from 'react';

interface AnalyticsData {
  platformStats: any;
  trendingPlaces: any[];
  searchTrends: any[];
  period: number;
}

/**
 * Admin analytics dashboard showing platform-wide statistics
 */
export default function AdminAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/analytics?days=${days}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
        setError('');
      } else {
        setError(data.error || 'Analitikler yüklenemedi');
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError('Analitikler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Analitikler yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 rounded bg-red-50">{error}</div>;
  }

  if (!analytics) {
    return null;
  }

  const stats = analytics.platformStats;

  return (
    <div className="space-y-8">
      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 30, 90, 365].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded font-medium ${
              days === d
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {d === 7 ? '7 gün' : d === 30 ? '30 gün' : d === 90 ? '90 gün' : '1 yıl'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Aktif Kullanıcı</p>
          <p className="text-3xl font-bold">{stats.uniqueUsers || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Görüntülenen Mekan</p>
          <p className="text-3xl font-bold">{stats.uniquePlacesViewed || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Toplam Aktivite</p>
          <p className="text-3xl font-bold">{Object.values(stats.activities || {}).reduce((a: number, b: any) => a + b, 0)}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Ort. Aktif Kullanıcı/Gün</p>
          <p className="text-3xl font-bold">
            {Math.round((stats.dailyActiveUsers?.reduce((sum: number, day: any) => sum + day.count, 0) || 0) / (stats.dailyActiveUsers?.length || 1))}
          </p>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold mb-4">Aktivite Dağılımı</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(stats.activities || {}).map(([type, count]: [string, any]) => (
            <div key={type} className="text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                {type === 'view' && '👁️ Görüntüleme'}
                {type === 'search' && '🔍 Arama'}
                {type === 'review' && '⭐ İnceleme'}
                {type === 'comment' && '💬 Yorum'}
                {type === 'favorite' && '❤️ Favori'}
              </p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Places */}
      <div>
        <h3 className="text-xl font-bold mb-4">Trend Olan Mekanlar</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {analytics.trendingPlaces.map(place => (
            <a
              key={place.id}
              href={`/mekan/${place.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition"
            >
              {place.image_url && (
                <div className="aspect-square bg-gray-200 rounded mb-2 overflow-hidden">
                  <img
                    src={place.image_url}
                    alt={place.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h4 className="font-bold text-sm mb-1 line-clamp-2">{place.name}</h4>
              <p className="text-xs text-gray-500 mb-2">{place.category}</p>
              <div className="flex justify-between text-xs">
                <span>👁️ {place.view_count}</span>
                <span>👥 {place.unique_viewers}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Search Trends */}
      <div>
        <h3 className="text-xl font-bold mb-4">Popüler Aramalar</h3>
        <div className="space-y-2">
          {analytics.searchTrends.slice(0, 10).map((trend, idx) => (
            <div key={idx} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
              <span className="font-medium">{trend.query}</span>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {trend.count} arama · {trend.unique_users} kişi
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
