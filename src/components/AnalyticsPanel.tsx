import React, { useState, useEffect } from 'react';

export default function AnalyticsPanel() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      console.error('Analytics error', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div>Yükleniyor...</div>;
  if (!analytics) return <div>Veri yüklenemedi</div>;

  const { summary, topPlaces, topUsers } = analytics;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analitik</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Toplam Kullanıcı</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Toplam İnceleme</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalReviews}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Toplam Mekan</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalPlaces}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Ort. Puan</p>
          <p className="text-3xl font-bold text-yellow-600">{summary.avgRating}⭐</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600">Bugün Aktif</p>
          <p className="text-3xl font-bold text-blue-700">{summary.activeToday}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">En Popüler Mekanlar</h3>
          <div className="space-y-3">
            {topPlaces.map((place, idx) => (
              <div key={place.id} className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">#{idx + 1} {place.name}</p>
                  <p className="text-sm text-gray-600">{place.review_count} inceleme</p>
                </div>
                <p className="text-yellow-600">⭐{parseFloat(place.avg_rating || 0).toFixed(1)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">En Aktif Kullanıcılar</h3>
          <div className="space-y-3">
            {topUsers.map((user, idx) => (
              <div key={user.id} className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">#{idx + 1} {user.full_name}</p>
                  <p className="text-sm text-gray-600">{user.review_count} inceleme</p>
                </div>
                <p className="text-blue-600">{user.points} puan</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
