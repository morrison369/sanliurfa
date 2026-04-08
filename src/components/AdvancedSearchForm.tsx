import React, { useState } from 'react';

interface SearchFilters {
  category?: string;
  minRating?: number;
  maxDistance?: number;
  priceRange?: 'free' | 'budget' | 'moderate' | 'expensive';
  openNow?: boolean;
  hasParking?: boolean;
  wifi?: boolean;
}

interface AdvancedSearchFormProps {
  onSearch?: (query: string, filters: SearchFilters) => void;
  onSave?: (name: string, query: string, filters: SearchFilters) => void;
}

export default function AdvancedSearchForm({ onSearch, onSave }: AdvancedSearchFormProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const categories = [
    { value: 'restaurant', label: 'Restoran' },
    { value: 'cafe', label: 'Kafe' },
    { value: 'hotel', label: 'Otel' },
    { value: 'attraction', label: 'Sehenswürdigkeit' },
    { value: 'museum', label: 'Müze' },
    { value: 'park', label: 'Park' },
    { value: 'shop', label: 'Alışveriş' },
    { value: 'entertainment', label: 'Eğlence' }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() || Object.keys(filters).length > 0) {
      onSearch?.(query, filters);

      // Navigate to search page with parameters
      const params = new URLSearchParams();
      params.set('q', query);
      if (Object.keys(filters).length > 0) {
        params.set('filters', JSON.stringify(filters));
      }
      window.location.href = `/arama?${params.toString()}`;
    }
  };

  const handleSaveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/users/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName,
          query,
          filters: Object.keys(filters).length > 0 ? filters : null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Arama kaydedilemedi');
      }

      onSave?.(saveName, query, filters);

      // Reset and close modal
      setSaveName('');
      setShowSaveModal(false);

      // Show success message
      alert('Arama başarıyla kaydedildi!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Arama kaydedilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSearch} className="space-y-4">
        {/* Main Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Yer, restoran, müze ara..."
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Ara
          </button>
        </div>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          {showFilters ? '✕ Filtreleri Kapat' : '⚙ Gelişmiş Filtreler'}
          {hasFilters && <span className="ml-2 inline-block w-2 h-2 bg-blue-600 rounded-full"></span>}
        </button>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategori
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    category: e.target.value || undefined
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tümü</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                En Düşük Puan: {filters.minRating || 0}
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={filters.minRating || 0}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minRating: e.target.value ? parseFloat(e.target.value) : undefined
                  })
                }
                className="w-full"
              />
            </div>

            {/* Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                En Fazla Mesafe: {filters.maxDistance || 50} km
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={filters.maxDistance || 50}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    maxDistance: parseInt(e.target.value)
                  })
                }
                className="w-full"
              />
            </div>

            {/* Amenities */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Olanaklar
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.openNow || false}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      openNow: e.target.checked || undefined
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Şu anda açık</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.hasParking || false}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      hasParking: e.target.checked || undefined
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Otopark</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.wifi || false}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      wifi: e.target.checked || undefined
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Wi-Fi</span>
              </label>
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <button
                type="button"
                onClick={() => setFilters({})}
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white py-2"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        )}

        {/* Save Search Button */}
        {(query.trim() || hasFilters) && (
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-2 font-medium"
          >
            💾 Bu Aramayı Kaydet
          </button>
        )}
      </form>

      {/* Save Search Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Aramayı Kaydet
            </h2>

            <form onSubmit={handleSaveSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Arama Adı
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Örn: Ucuz Restoranlar"
                  maxLength={100}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  disabled={isSaving}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving || !saveName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false);
                    setSaveName('');
                  }}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors font-medium"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
