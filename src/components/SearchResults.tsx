import React, { useState } from 'react';

interface Place {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  image?: string;
}

export default function SearchResults() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [results, setResults] = useState<Place[]>([
    { id: '1', name: 'Göbeklitepe', category: 'Tarihi', rating: 4.8, reviewCount: 245 },
    { id: '2', name: 'Balıklıgöl', category: 'Doğal', rating: 4.6, reviewCount: 189 },
    { id: '3', name: 'Harran', category: 'Tarihi', rating: 4.5, reviewCount: 156 }
  ]);

  const categories = ['Tümü', 'Tarihi', 'Doğal', 'Yemek', 'Kültür', 'Eğlence'];

  return (
    <div className="container-custom py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Şanlıurfa'yı Keşfet
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {results.length} sonuç bulundu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Filtreler</h3>

            {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ara
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Yer adı..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat === 'Tümü' ? '' : cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Puan: {minRating.toFixed(1)} ⭐
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
              Ara
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <div className="space-y-4">
            {results.map((place) => (
              <div
                key={place.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex gap-6">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {place.name}
                    </h3>
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-3 py-1 rounded-full">
                        {place.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">★</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {place.rating}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({place.reviewCount} yorum)
                        </span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/yerler/${place.id}`}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap h-fit"
                  >
                    Detaylar
                  </a>
                </div>
              </div>
            ))}
          </div>

          {results.length === 0 && (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              <p className="text-lg mb-2">Sonuç bulunamadı</p>
              <p className="text-sm">Arama kriterlerini değiştirip tekrar deneyin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
