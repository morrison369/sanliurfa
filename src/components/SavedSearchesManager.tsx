import React, { useState, useEffect } from 'react';

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: any;
  created_at: string;
}

export default function SavedSearchesManager() {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  const loadSavedSearches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/users/saved-searches');

      if (!response.ok) {
        throw new Error('Kayıtlı aramalar yüklenemedi');
      }

      const data = await response.json();
      setSearches(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteSearch = (search: SavedSearch) => {
    // Navigate to search page with saved search parameters
    const params = new URLSearchParams();
    params.set('q', search.query);
    if (search.filters) {
      params.set('filters', JSON.stringify(search.filters));
    }
    window.location.href = `/arama?${params.toString()}`;
  };

  const handleDeleteSearch = async (searchId: string) => {
    if (isDeletingId) return;

    setIsDeletingId(searchId);
    setError(null);

    try {
      const response = await fetch(`/api/users/saved-searches/${searchId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Silme işlemi başarısız');
      }

      setSearches(searches.filter((s) => s.id !== searchId));
      setDeleteConfirmId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setIsDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {searches.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="mb-2">Henüz kayıtlı arama yok</p>
          <a href="/arama" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm">
            Arama yap ve kaydet
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Toplam {searches.length} kayıtlı arama
          </p>

          {searches.map((search) => (
            <div
              key={search.id}
              className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {search.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                    Arama: <span className="font-mono">{search.query}</span>
                  </p>

                  {search.filters && Object.keys(search.filters).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(search.filters).map(([key, value]) => (
                        <span
                          key={key}
                          className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded"
                        >
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Kaydedildi: {new Date(search.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleExecuteSearch(search)}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Ara
                  </button>

                  {deleteConfirmId === search.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDeleteSearch(search.id)}
                        disabled={isDeletingId === search.id}
                        className="px-2 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        {isDeletingId === search.id ? '...' : 'Evet'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={isDeletingId === search.id}
                        className="px-2 py-2 bg-gray-400 text-white text-sm rounded-lg hover:bg-gray-500 disabled:opacity-50 transition-colors"
                      >
                        Hayır
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(search.id)}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Sil
                    </button>
                  )}
                </div>
              </div>

              {deleteConfirmId === search.id && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Silmek istediğinizden emin misiniz?
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
