import React, { useState, useEffect } from 'react';
import { fetchAdminAnalytics } from '../lib/admin-browser-client';
import type { AdminAnalyticsData } from '../types/admin-api';

/**
 * Admin analytics dashboard showing platform-wide statistics
 */
export default function AdminAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAdminAnalytics(days, 10);
      setAnalytics(data);
      setError('');
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
  const totalTimeHours = Math.round((stats.totalTimeSpent || 0) / 3600);

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
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Toplam Oturum</p>
          <p className="text-3xl font-bold">{stats.totalSessions || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Benzersiz Sayfa</p>
          <p className="text-3xl font-bold">{stats.uniquePages || 0}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Toplam Arama</p>
          <p className="text-3xl font-bold">{stats.uniqueSearches || 0}</p>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold mb-4">Platform Özeti</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Ortalama Oturum Süresi</p>
            <p className="text-2xl font-bold">{stats.avgSessionDuration || 0} sn</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Toplam Geçirilen Süre</p>
            <p className="text-2xl font-bold">{totalTimeHours} saat</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Toplam Dönüşüm</p>
            <p className="text-2xl font-bold">{stats.totalConversions || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Analiz Periyodu</p>
            <p className="text-2xl font-bold">{analytics.period} gün</p>
          </div>
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
              <h4 className="font-bold text-sm mb-1 line-clamp-2">{place.name}</h4>
              <p className="text-xs text-gray-500 mb-2">{place.category}</p>
              <div className="flex justify-between text-xs">
                <span>👁️ {place.totalViews}</span>
                <span>⭐ {place.avgRating.toFixed(1)}</span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-500">
                <span>📝 {place.reviewCount}</span>
                <span>👍 {place.totalLikes}</span>
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
                {trend.count} arama · ort. {trend.avgResults} sonuç
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
