import React, { useState, useEffect } from 'react';

interface FollowedPlace {
  id: string;
  name: string;
  category: string;
  rating: number;
  image?: string;
  followedAt: string;
}

export default function FollowedPlacesPanel() {
  const [places, setPlaces] = useState<FollowedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFollowedPlaces();
  }, []);

  const loadFollowedPlaces = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/user/following/places?limit=50');

      if (!response.ok) {
        throw new Error('Takip edilen mekanlar yüklenemedi');
      }

      const data = await response.json();
      setPlaces(data.places || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="mb-4">Henüz hiç mekan takip etmiyorsunuz</p>
        <a href="/arama" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
          Mekan bul ve takip et →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Takip Ettiğim Mekanlar
        </h3>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {places.length} mekan
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {places.map((place) => (
          <a
            key={place.id}
            href={`/mekan/${place.id}`}
            className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg transition-shadow"
          >
            {place.image && (
              <img
                src={place.image}
                alt={place.name}
                className="w-full h-32 object-cover"
              />
            )}

            <div className="p-4">
              <h4 className="font-bold text-gray-900 dark:text-white truncate">
                {place.name}
              </h4>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {place.category}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400">★</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {place.rating.toFixed(1)}
                  </span>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(place.followedAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <button
        onClick={loadFollowedPlaces}
        className="w-full py-2 px-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-600 dark:border-blue-400 rounded-lg font-medium transition-colors"
      >
        Yenile
      </button>
    </div>
  );
}
