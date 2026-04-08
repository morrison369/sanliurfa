/**
 * Advanced Search Panel Component
 * AI-powered search with filters and personalized recommendations
 */
import { useEffect, useState } from 'react';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  average_rating: number;
  review_count: number;
  image_url?: string;
  ranking_score?: number;
}

export function AdvancedSearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [category, setCategory] = useState('');
  const [minRating, setMinRating] = useState(0);

  const categories = ['Restoran', 'Kafe', 'Tarihî Yer', 'Etkinlik', 'Otel', 'Alışveriş'];

  useEffect(() => {
    if (query.length >= 2) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions', err);
    }
  };

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setShowSuggestions(false);

      const params = new URLSearchParams({
        q: searchQuery,
        limit: '20'
      });

      if (category) params.append('category', category);
      if (minRating > 0) params.append('minRating', minRating.toString());

      const res = await fetch(`/api/search/advanced?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.data || []);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => query.length > 0 && setShowSuggestions(true)}
              placeholder="Mekan, kategori veya etkinlik arayın..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-10">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                  >
                    <span className="text-sm text-gray-700">🔍 {suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
          >
            {loading ? 'Aranıyor...' : 'Ara'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tümü</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Puan: {minRating.toFixed(1)}
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
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-24 animate-pulse"></div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && query && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">"{query}" için sonuç bulunamadı.</p>
          <p className="text-sm">Farklı bir arama terimi deneyebilirsiniz.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{results.length} sonuç bulundu</p>

          {results.map((result) => (
            <div
              key={result.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 flex gap-4 cursor-pointer"
            >
              {result.image_url && (
                <img
                  src={result.image_url}
                  alt={result.title}
                  className="w-24 h-24 object-cover rounded"
                />
              )}

              <div className="flex-1">
                <h3 className="font-semibold text-lg">{result.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{result.description}</p>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>📁 {result.category}</span>
                    <span>⭐ {result.average_rating.toFixed(1)} ({result.review_count})</span>
                  </div>

                  {result.ranking_score && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Eşleşme: {(result.ranking_score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
