import React, { useState, useEffect } from 'react';

interface Recommendation {
  id: string;
  name: string;
  category: string;
  rating: number;
  image_url?: string;
  reason?: string;
  score?: number;
}

interface RecommendedPlacesProps {
  userId?: string;
  type?: 'hybrid' | 'content' | 'collaborative' | 'trending';
  limit?: number;
  showReason?: boolean;
  title?: string;
}

/**
 * Display personalized or trending place recommendations
 */
export default function RecommendedPlaces({
  userId,
  type = 'hybrid',
  limit = 10,
  showReason = true,
  title = 'Size Önerilen Mekanlar'
}: RecommendedPlacesProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeType, setActiveType] = useState(type);

  useEffect(() => {
    loadRecommendations();
  }, [userId, activeType, limit]);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        type: activeType,
        limit: limit.toString()
      });

      const response = await fetch(`/api/recommendations/hybrid?${params}`);
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.data);
        setError('');
      } else {
        setError(data.error || 'Öneriler yüklenemedi');
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError('Öneriler yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-gray-500">{error}</div>;
  }

  if (recommendations.length === 0) {
    return <div className="text-center py-8 text-gray-500">Henüz öneri yok</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header with Type Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>

        {userId && (
          <div className="flex gap-2 text-sm">
            {['hybrid', 'content', 'collaborative', 'trending'].map(t => (
              <button
                key={t}
                onClick={() => setActiveType(t as any)}
                className={`px-3 py-1 rounded ${
                  activeType === t
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {t === 'hybrid' && 'Tüm Öneriler'}
                {t === 'content' && 'İçerik Tabanlı'}
                {t === 'collaborative' && 'Sosyal'}
                {t === 'trending' && 'Trend'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {recommendations.map(rec => (
          <a
            key={rec.id}
            href={`/mekan/${rec.id}`}
            className="group bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition"
          >
            {/* Image */}
            <div className="aspect-square bg-gray-200 overflow-hidden">
              {rec.image_url ? (
                <img
                  src={rec.image_url}
                  alt={rec.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  📍
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-3">
              {/* Name and Category */}
              <h3 className="font-bold text-sm mb-1 line-clamp-2 text-blue-600 group-hover:text-blue-700">
                {rec.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{rec.category}</p>

              {/* Rating */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold">⭐ {rec.rating.toFixed(1)}</span>
              </div>

              {/* Reason */}
              {showReason && rec.reason && (
                <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded line-clamp-1">
                  {rec.reason}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
