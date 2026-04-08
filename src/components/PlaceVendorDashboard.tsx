import React, { useState, useEffect } from 'react';

interface PlaceAnalytics {
  views: number;
  uniqueViewers: number;
  dailyViews: any[];
  activities: Record<string, number>;
}

interface PlaceVendorDashboardProps {
  placeId: string;
}

/**
 * Dashboard for place owners/vendors to view analytics
 */
export default function PlaceVendorDashboard({ placeId }: PlaceVendorDashboardProps) {
  const [analytics, setAnalytics] = useState<PlaceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [placeId, days]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/places/${placeId}/analytics?days=${days}`);
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
    return <div className="text-center py-12">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 rounded bg-red-50">{error}</div>;
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-2 rounded font-medium ${
              days === d
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {d === 7 ? '7 gün' : d === 30 ? '30 gün' : '90 gün'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Toplam Görüntüleme</p>
          <p className="text-3xl font-bold">{analytics.views}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Benzersiz Ziyaretçi</p>
          <p className="text-3xl font-bold">{analytics.uniqueViewers}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-2">Ort. Ziyaret/Gün</p>
          <p className="text-3xl font-bold">
            {Math.round(analytics.views / days)}
          </p>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold mb-4">Aktivite Dağılımı</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(analytics.activities || {}).map(([type, count]: [string, number]) => (
            <div key={type} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
              <p className="text-2xl mb-2">
                {type === 'view' && '👁️'}
                {type === 'review' && '⭐'}
                {type === 'comment' && '💬'}
                {type === 'favorite' && '❤️'}
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                {type === 'view' && 'Görüntüleme'}
                {type === 'review' && 'İnceleme'}
                {type === 'comment' && 'Yorum'}
                {type === 'favorite' && 'Favori'}
              </p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Views Chart Info */}
      {analytics.dailyViews && analytics.dailyViews.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-xl font-bold mb-4">Günlük Görüntülemeler</h3>
          <div className="space-y-2">
            {analytics.dailyViews.slice(0, 10).map((day: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(day.date).toLocaleDateString('tr-TR')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(day.count / Math.max(...analytics.dailyViews.map((d: any) => d.count))) * 100}%`
                      }}
                    />
                  </div>
                  <span className="font-bold w-8 text-right">{day.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
