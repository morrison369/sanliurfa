import React, { useState, useEffect } from 'react';

export default function PlaceAnalyticsPanel({ placeId }) {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [placeId]);

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/places/' + placeId + '/analytics');
      if (!response.ok) throw new Error('Failed');
      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      console.error('Error', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center py-8">Yukleniyor...</div>;
  if (!analytics) return <div>Veri yuklenemedi</div>;

  const { reviews, ratingDistribution, favorites, views } = analytics;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mekan Analitikleri</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Incelemeler</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{reviews.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Ort. Puan</p>
          <p className="text-3xl font-bold text-yellow-600">{reviews.average}⭐</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Favoriler</p>
          <p className="text-3xl font-bold text-red-600">{favorites}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Goruntulemeler</p>
          <p className="text-3xl font-bold text-blue-600">{views}</p>
        </div>
      </div>

      {ratingDistribution.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Puan Dagilimi</h3>
          <div className="space-y-3">
            {ratingDistribution.map((dist) => (
              <div key={dist.rating} className="flex items-center gap-3">
                <span className="w-12 text-sm font-medium">{dist.rating}⭐</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-6 rounded-full overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full transition-all"
                    style={{ width: (dist.count / (ratingDistribution[0]?.count || 1)) * 100 + '%' }}
                  />
                </div>
                <span className="w-12 text-right text-sm text-gray-600">{dist.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
